import debugFactory from 'debug';
import { isEqual, isEmpty } from 'lodash';
import calculateUpdates, { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from './calculate-updates';
import { combineComponentRequirements } from './requirements';
import { default as getDataFromState } from './get-data';
import requireData from './require-data';

const debug = debugFactory( 'fresh-data:api-client' );

export const DEFAULT_FETCH_TIMEOUT = 60000; // TODO: Remove this after we get it from requirements below.

function _setTimer( callback, delay ) {
	return window.setTimeout( callback, delay );
}

function _clearTimer( id ) {
	return window.clearTimeout( id );
}

export default class ApiClient {
	constructor( api, key, setTimer = _setTimer, clearTimer = _clearTimer ) {
		this.api = api;
		this.key = key;
		this.subscriptionCallbacks = new Set();
		this.requirementsByComponent = new Map();
		this.requirementsByEndpoint = {};
		this.methods = mapMethods( api.methods, key );
		this.minUpdate = DEFAULT_MIN_UPDATE;
		this.maxUpdate = DEFAULT_MAX_UPDATE;
		this.setTimer = setTimer;
		this.clearTimer = clearTimer;
		this.timeoutId = null;
		this.state = {};
		debug( 'New ApiClient "' + key + '" for api: ', api );
	}

	setState = ( state, now = new Date() ) => {
		if ( this.state !== state ) {
			this.state = state;
			this.updateTimer( now );
			this.subscriptionCallbacks.forEach( ( callback ) => callback( this ) );
		}
	}

	// TODO: See if setComponentData can be the subscription.
	// Then this wouldn't be needed and each subscription could be more fine-grained.
	subscribe = ( callback ) => {
		if ( this.subscriptionCallbacks.has( callback ) ) {
			debug( 'Attempting to add a subscription callback twice:', callback );
			return false;
		}
		this.subscriptionCallbacks.add( callback );
		return callback;
	}

	unsubscribe = ( callback ) => {
		if ( ! this.subscriptionCallbacks.has( callback ) ) {
			debug( 'Attempting to remove a callback that is not subscribed:', callback );
			return false;
		}
		this.subscriptionCallbacks.delete( callback );
		return callback;
	}

	getData = ( endpointPath, params ) => {
		return getDataFromState( this.state )( endpointPath, params );
	};

	setComponentData = ( component, selectorFunc, now = new Date() ) => {
		if ( selectorFunc ) {
			const componentRequirements = [];
			const selectors = mapSelectors( this.api.selectors, this.getData, requireData( componentRequirements ) );
			selectorFunc( selectors );

			this.requirementsByComponent.set( component, componentRequirements );
		} else {
			this.requirementsByComponent.clear( component );
		}

		// TODO: Consider using a reducer style function for endpoint requirements so we don't
		// have to do a deep equals check.
		const requirementsByEndpoint = combineComponentRequirements( this.requirementsByComponent );
		if ( ! isEqual( this.requirementsByEndpoint, requirementsByEndpoint ) ) {
			this.requirementsByEndpoint = requirementsByEndpoint;
			this.updateTimer( now );
		}
	};

	updateRequirementsData = ( now ) => {
		const { requirementsByEndpoint, state, minUpdate, maxUpdate } = this;
		const endpointsState = state.endpoints || {};

		if ( ! isEmpty( requirementsByEndpoint ) ) {
			const { nextUpdate, updates } =
				calculateUpdates( requirementsByEndpoint, endpointsState, minUpdate, maxUpdate, now );

			updates.forEach( ( update ) => {
				const { endpointPath, params } = update;
				// TODO: Get timeout allowed from requirement and use it here.
				this.fetchData( endpointPath, params, DEFAULT_FETCH_TIMEOUT );
				this.api.dataRequested( this.key, endpointPath, params );
			} );

			debug( `Scheduling next update for ${ nextUpdate / 1000 } seconds.` );
			this.updateTimer( now, nextUpdate );
		} else if ( this.timeoutId ) {
			debug( 'Unscheduling future updates' );
			this.updateTimer( now, null );
		}
	}

	updateTimer = ( now, nextUpdate = undefined ) => {
		const { requirementsByEndpoint, state, minUpdate, maxUpdate } = this;
		const endpointsState = state.endpoints || {};

		if ( undefined === nextUpdate ) {
			nextUpdate = calculateUpdates(
				requirementsByEndpoint,
				endpointsState,
				minUpdate,
				maxUpdate,
				now
			).nextUpdate;
		}

		if ( this.timeoutId ) {
			this.clearTimer( this.timeoutId );
			this.timeoutId = null;
		}

		if ( nextUpdate ) {
			this.timeoutId = this.setTimer( this.updateRequirementsData, nextUpdate );
		}
	}

	fetchData = ( endpointPath, params, timeout, endpoints = this.api.endpoints ) => {
		const [ endpointName, ...remainingPath ] = endpointPath;
		const endpoint = endpoints[ endpointName ];

		if ( ! endpoint ) {
			throw new TypeError( `Failed to find required endpoint "${ endpointName }" in api.` );
		}

		if ( remainingPath.length > 0 && endpoint[ remainingPath[ 0 ] ] ) {
			// Looks like we can go down a level in the path.
			return this.fetchData( remainingPath, params, timeout, endpoint );
		}

		if ( ! endpoint.read ) {
			throw new TypeError( `Endpoint "${ endpointName }" has no read method.` );
		}

		const value = endpoint.read( this.methods, remainingPath, params );
		return this.waitForData( endpointPath, params, value, timeout );
	}

	/**
	 * Return a promise that takes value as another promise or just data.
	 * @param {Array} endpointPath The endpoint path of the data we're waiting for.
	 * @param {Object} params The params of the data we want (or undefined if none).
	 * @param {Promise | any } value Either the data itself, or a promise that resolves to it.
	 * @param {number} timeout Timeout (in milliseconds allowed until promise is automatically rejected.
	 * @return {Object} A promise that resolves to an object: { endpointPath, params, data|error }.
	 */
	waitForData = ( endpointPath, params, value, timeout ) => {
		let response = null;

		const success = ( data ) => {
			this.api.dataReceived( this.key, endpointPath, params, data );
			response = { endpointPath, params, data };
			return response;
		};

		const failure = ( error ) => {
			this.api.errorReceived( this.key, endpointPath, params, error );
			response = { endpointPath, params, error };
			return response;
		};

		const fetchPromise = Promise.resolve().then( () => value ).then( success ).catch( failure );

		const timeoutPromise = new Promise( ( resolve, reject ) => {
			const timeoutId = this.setTimer( () => {
				this.clearTimer( timeoutId );
				if ( ! response ) {
					const error = { message: `Timeout of ${ timeout } reached.` };
					this.api.errorReceived( this.key, endpointPath, params, error );
					reject( { endpointPath, params, error } );
				}
			}, timeout );
		} );

		return Promise.race( [ fetchPromise, timeoutPromise ] );
	}
}

function mapMethods( methods, clientKey ) {
	return Object.keys( methods ).reduce( ( mappedMethods, methodName ) => {
		mappedMethods[ methodName ] = methods[ methodName ]( clientKey );
		return mappedMethods;
	}, {} );
}

function mapSelectors( selectors, clientGetData, clientRequireData ) {
	return Object.keys( selectors ).reduce( ( mappedSelectors, selectorName ) => {
		mappedSelectors[ selectorName ] = selectors[ selectorName ]( clientGetData, clientRequireData );
		return mappedSelectors;
	}, [] );
}
