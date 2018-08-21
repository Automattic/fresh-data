import debugFactory from 'debug';
import { isArray, isEqual, isEmpty } from 'lodash';
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
	constructor( api, setTimer = _setTimer, clearTimer = _clearTimer ) {
		this.api = api;
		this.subscriptionCallbacks = new Set();
		this.requirementsByComponent = new Map();
		this.requirementsByResource = {};
		this.methods = api.methods;
		this.operations = this.mapOperations( api.operations );
		this.mutations = mapFunctions( api.mutations, this.operations );
		this.minUpdate = DEFAULT_MIN_UPDATE;
		this.maxUpdate = DEFAULT_MAX_UPDATE;
		this.setTimer = setTimer;
		this.clearTimer = clearTimer;
		this.timeoutId = null;
		this.state = {};
		debug( 'New ApiClient for api: ', api );
	}

	mapOperations = ( apiOperations ) => {
		return Object.keys( apiOperations ).reduce( ( operations, operationName ) => {
			operations[ operationName ] = ( resourceNames, data ) => {
				return this.applyOperation( operationName, resourceNames, data );
			};
			return operations;
		}, {} );
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

	getResource = ( resourceName ) => {
		const resources = this.state.resources || {};
		const resource = resources[ resourceName ] || {};
		return resource;
	};

	requireResource = ( componentRequirements ) => ( requirement, resourceName ) => {
		componentRequirements.push( { ...requirement, resourceName } );
		return this.getResource( resourceName );
	};

	getMutations = () => {
		return this.mutations;
	}

	setComponentData = ( component, selectorFunc, now = new Date() ) => {
		if ( selectorFunc ) {
			const componentRequirements = [];
			const selectors = mapFunctions( this.api.selectors, this.getResource, this.requireResource( componentRequirements ) );
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
				const readOperation = this.operations[ this.api.readOperationName ];
				if ( ! readOperation ) {
					throw new Error( `Operation "${ this.api.readOperationName }" not found.` );
				}
				this.operations[ this.api.readOperationName ]( updates );
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
	 * @return {Promise} Root promise of operation. Resolves when all requests have resolved.
	 */
	applyOperation = ( operationName, resourceNames, data ) => {
		this.api.dataRequested( resourceNames );

		const apiOperation = this.api.operations[ operationName ];
		if ( ! apiOperation ) {
			throw new Error( `Operation "${ operationName } not found.` );
		}

		const rootPromise = new Promise( ( resolve, reject ) => {
			try {
				const operationResult = apiOperation( this.methods )( resourceNames, data ) || [];
				const values = isArray( operationResult ) ? operationResult : [ operationResult ];

				const requests = values.map( value => {
					// This takes any value (including a promise) and wraps it in a promise.
					const promise = Promise.resolve().then( () => value );

					return promise
						.then( ( resources ) => this.api.dataReceived( resources ) )
						.catch( error => this.api.unhandledErrorReceived( operationName, resourceNames, error ) );
				} );

				// TODO: Maybe some monitoring of promises to ensure they all resolve?
				const all = Promise.all( requests );
				resolve( all );
				//resolve( Promise.all( requests ) );
			} catch ( error ) {
				this.api.unhandledErrorReceived( operationName, resourceNames, error );
				reject( error );
			}
		} );
		return rootPromise;
	}
}

function mapFunctions( functionsByName, ...params ) {
	return Object.keys( functionsByName ).reduce( ( mappedFunctions, functionName ) => {
		mappedFunctions[ functionName ] = functionsByName[ functionName ]( ...params );
		return mappedFunctions;
	}, {} );
}
