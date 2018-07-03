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
	 * @return {Promise} Root promise of operation. Resolves when all requests have resolved.
	 */
	applyOperation = ( operationName, resourceNames, data ) => {
		this.dataRequested( resourceNames );

		const operation = this.operations[ operationName ];
		if ( ! operation ) {
			throw new Error( `Operation "${ operationName } not found.` );
		}

		const rootPromise = new Promise( () => {
			try {
				const operationResult = operation( resourceNames, data ) || [];
				const values = isArray( operationResult ) ? operationResult : [ operationResult ];

				const requests = values.map( value => {
					// This takes any value (including a promise) and wraps it in a promise.
					const promise = Promise.resolve().then( () => value );

					return promise
						.then( this.dataReceived )
						.catch( error => this.unhandledErrorReceived( operationName, resourceNames, error ) );
				} );

				// TODO: Maybe some monitoring of promises to ensure they all resolve?
				return Promise.all( requests );
			} catch ( error ) {
				this.unhandledErrorReceived( operationName, resourceNames, error );
			}
		} );
		return rootPromise;
	}

	/**
	 * Calls data handler to update state with updated lastRequested timestamps.
	 * @param {Array} resourceNames The names of the resources that were requested.
	 * @param {Date} [time] (optional, for test) The time of the request.
	 */
	dataRequested = ( resourceNames, time = new Date() ) => {
		// Set timestamp on each resource.
		const updatedResources = resourceNames.reduce( ( resources, resourceName ) => {
			resources[ resourceName ] = { lastRequested: time };
			return resources;
		}, {} );
		this.api.dataReceived( this.key, updatedResources );
	}

	/**
	 * Calls data handler to update state with updated data/errors and lastReceived/errorReceived timestamps.
	 * @param {Object} data The partial or full data of the resources that were received, indexed by name.
	 * @param {Date} [time] (optional, for test) The time of the request.
	 */
	dataReceived = ( data, time = new Date() ) => {
		// Set timestamp on each resource.
		const updatedResources = Object.keys( data ).reduce( ( resources, resourceName ) => {
			const resource = data[ resourceName ];
			if ( resource.error ) {
				resources[ resourceName ] = { ...resource, errorReceived: time };
			}
			if ( resource.data ) {
				resources[ resourceName ] = { ...resource, lastReceived: time };
			}
			return resources;
		}, {} );
		this.api.dataReceived( this.key, updatedResources );
	}

	/**
	 * Calls api error handler with info.
	 * @param {string} operationName The name of the operation upon which the error occurred.
	 * @param {Array} resourceNames The resourceNames for the faulty operation.
	 * @param {any} error The error which occurred.
	 */
	unhandledErrorReceived = ( operationName, resourceNames, error ) => {
		this.api.unhandledErrorReceived( this.key, operationName, resourceNames, error );
	}
}

// TODO: Combine the four methods below to be more DRY.
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
	return Object.keys( operations ).reduce( ( mappedOperations, operationName ) => {
		mappedOperations[ operationName ] = operations[ operationName ]( methods );
		return mappedOperations;
	}, {} );
}
