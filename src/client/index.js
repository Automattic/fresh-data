import debugFactory from 'debug';
import { isEqual, isEmpty } from 'lodash';
import calculateUpdates, { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from './calculate-updates';
import { combineComponentRequirements } from './requirements';

const debug = debugFactory( 'fresh-data:api-client' );

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
		this.requirementsByResource = {};
		this.methods = mapMethods( api.methods, key );
		this.operations = mapOperations( api.operations, this.methods );
		this.mutations = mapMutations( api.mutations, this.operations );
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

	getData = ( resourceName ) => {
		const resources = this.state.resources || {};
		const resource = resources[ resourceName ] || {};
		return resource.data;
	};

	getMutations = () => {
		return this.mutations;
	}

	requireData = ( componentRequirements ) => ( requirement, resourceName ) => {
		componentRequirements.push( { ...requirement, resourceName } );
		return componentRequirements;
	};

	setComponentData = ( component, selectorFunc, now = new Date() ) => {
		if ( selectorFunc ) {
			const componentRequirements = [];
			const selectors = mapSelectors( this.api.selectors, this.getData, this.requireData( componentRequirements ) );
			selectorFunc( selectors );

			this.requirementsByComponent.set( component, componentRequirements );
		} else {
			this.requirementsByComponent.clear( component );
		}

		// TODO: Consider using a reducer style function for resource requirements so we don't
		// have to do a deep equals check.
		const requirementsByResource = combineComponentRequirements( this.requirementsByComponent );
		if ( ! isEqual( this.requirementsByResource, requirementsByResource ) ) {
			this.requirementsByResource = requirementsByResource;
			this.updateTimer( now );
		}
	};

	updateRequirementsData = ( now ) => {
		const { requirementsByResource, state, minUpdate, maxUpdate } = this;
		const resourceState = state.resources || {};

		if ( ! isEmpty( requirementsByResource ) ) {
			const { nextUpdate, updates } =
				calculateUpdates( requirementsByResource, resourceState, minUpdate, maxUpdate, now );

			if ( updates && updates.length > 0 ) {
				this.applyOperation( this.api.readOperationName, updates );
			}

			debug( `Scheduling next update for ${ nextUpdate / 1000 } seconds.` );
			this.updateTimer( now, nextUpdate );
		} else if ( this.timeoutId ) {
			debug( 'Unscheduling future updates' );
			this.updateTimer( now, null );
		}
	}

	updateTimer = ( now, nextUpdate = undefined ) => {
		const { requirementsByResource, state, minUpdate, maxUpdate } = this;
		const resourceState = state.resources || {};

		if ( undefined === nextUpdate ) {
			nextUpdate = calculateUpdates(
				requirementsByResource,
				resourceState,
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

	/**
	 * Apply a given operation's handlers to a set of resourceNames.
	 * @param {string} operationName The name of the operation to apply.
	 * @param {Array} resourceNames The resources upon which to apply the operation.
	 * @param {any} [data] (optional) data to apply via this operation.
	 * @return {Object} Resource request promises keyed by resourceName.
	 */
	applyOperation = ( operationName, resourceNames, data ) => {
		const handlers = this.operations[ operationName ];
		let resourceRequests = {};

		handlers.forEach( handlerFunc => {
			const handled = handlerFunc( resourceNames, data );
			resourceRequests = { ...resourceRequests, ...handled };
		} );

		return resourceNames.reduce( ( requests, resourceName ) => {
			const requirement = this.requirementsByResource[ resourceName ] || {};
			const timeout = requirement.timeout;
			const value = resourceRequests[ resourceName ];
			if ( value ) {
				requests[ resourceName ] = this.waitForData( resourceName, value, timeout );
			} else {
				debug( `Unhandled resource "${ resourceName }" for "${ operationName }" operation.` );
			}
			return requests;
		}, {} );
	}

	/**
	 * Return a promise that takes value as another promise or just data.
	 * @param {string} resourceName The resourceName for this operation. (e.g. 'thing:1')
	 * @param {Promise | any } value Either the data itself, or a promise that resolves to it.
	 * @param {number} timeout Timeout (in milliseconds allowed until promise is automatically rejected.
	 * @return {Object} A promise that resolves to an object: { resourceName, data|error }.
	 */
	waitForData = ( resourceName, value, timeout = 60000 ) => {
		let response = null;

		this.api.dataRequested( this.key, resourceName );

		const success = ( data ) => {
			this.api.dataReceived( this.key, resourceName, data );
			response = { resourceName, data };
			return response;
		};

		const failure = ( error ) => {
			this.api.errorReceived( this.key, resourceName, error );
			response = { resourceName, error };
			return response;
		};

		const fetchPromise = Promise.resolve().then( () => value ).then( success ).catch( failure );

		const timeoutPromise = new Promise( ( resolve, reject ) => {
			const timeoutId = this.setTimer( () => {
				this.clearTimer( timeoutId );
				if ( ! response ) {
					const error = { message: `Timeout of ${ timeout } reached.` };
					this.api.errorReceived( this.key, resourceName, error );
					reject( { resourceName, error } );
				}
			}, timeout );
		} );

		return Promise.race( [ fetchPromise, timeoutPromise ] );
	}
}

// TODO: See if the three methods below could be more DRY.
function mapMethods( methods, clientKey ) {
	return Object.keys( methods ).reduce( ( mappedMethods, methodName ) => {
		mappedMethods[ methodName ] = methods[ methodName ]( clientKey );
		return mappedMethods;
	}, {} );
}

function mapMutations( mutations, operations ) {
	return Object.keys( mutations ).reduce( ( mappedMutations, mutationName ) => {
		mappedMutations[ mutationName ] = mutations[ mutationName ]( operations );
		return mappedMutations;
	}, {} );
}

function mapSelectors( selectors, clientGetData, clientRequireData ) {
	return Object.keys( selectors ).reduce( ( mappedSelectors, selectorName ) => {
		mappedSelectors[ selectorName ] = selectors[ selectorName ]( clientGetData, clientRequireData );
		return mappedSelectors;
	}, {} );
}

function mapOperations( operations, methods ) {
	return Object.keys( operations ).reduce( ( mappedOperations, name ) => {
		const handlers = operations[ name ];
		mappedOperations[ name ] = handlers.map( handler => handler( methods ) );
		return mappedOperations;
	}, {} );
}
