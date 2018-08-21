import debugFactory from 'debug';
import { isArray, isEqual, isEmpty, uniqueId } from 'lodash';
import calculateUpdates, { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from './calculate-updates';
import { combineComponentRequirements } from './requirements';

const DEFAULT_READ_OPERATION = 'read';

function _setTimer( callback, delay ) {
	return window.setTimeout( callback, delay );
}

function _clearTimer( id ) {
	return window.clearTimeout( id );
}

export default class ApiClient {
	constructor( apiSpec, setTimer = _setTimer, clearTimer = _clearTimer ) {
		const { operations, mutations, selectors } = apiSpec;
		const readOperationName = apiSpec.readOperationName || DEFAULT_READ_OPERATION;

		this.uid = uniqueId();
		this.debug = debugFactory( `fresh-data:api-client[${ this.uid }]` );
		this.debug( 'New ApiClient for apiSpec: ', apiSpec );

		this.operations = operations && this.mapOperations( operations );
		this.mutations = mutations && mapFunctions( mutations, this.operations );
		this.selectors = selectors;
		this.readOperationName = readOperationName;

		this.dataHandlers = null;
		this.subscriptionCallbacks = new Set();
		this.requirementsByComponent = new Map();
		this.requirementsByResource = {};
		this.minUpdate = DEFAULT_MIN_UPDATE;
		this.maxUpdate = DEFAULT_MAX_UPDATE;
		this.setTimer = setTimer;
		this.clearTimer = clearTimer;
		this.timeoutId = null;
		this.state = {};
	}

	mapOperations = ( apiOperations ) => {
		return Object.keys( apiOperations ).reduce( ( operations, operationName ) => {
			operations[ operationName ] = ( resourceNames, data ) => {
				const apiOperation = apiOperations[ operationName ];
				return this.applyOperation( apiOperation, resourceNames, data );
			};
			return operations;
		}, {} );
	}

	setDataHandlers = ( { dataRequested, dataReceived } ) => {
		this.dataHandlers = { dataRequested, dataReceived };
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
			this.debug( 'Attempting to add a subscription callback twice:', callback );
			return false;
		}
		this.subscriptionCallbacks.add( callback );
		return callback;
	}

	unsubscribe = ( callback ) => {
		if ( ! this.subscriptionCallbacks.has( callback ) ) {
			this.debug( 'Attempting to remove a callback that is not subscribed:', callback );
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
			const selectors = mapFunctions( this.selectors, this.getResource, this.requireResource( componentRequirements ) );
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

	updateRequirementsData = async ( now ) => {
		const { requirementsByComponent, requirementsByResource, state, minUpdate, maxUpdate } = this;
		const resourceState = state.resources || {};

		const componentCount = requirementsByComponent.size;
		const resourceCount = Object.keys( requirementsByResource ).length;
		this.debug( `Updating requirements for ${ componentCount } components and ${ resourceCount } resources.` );

		if ( ! isEmpty( requirementsByResource ) ) {
			const { nextUpdate, updates } =
				calculateUpdates( requirementsByResource, resourceState, minUpdate, maxUpdate, now );

			if ( updates && updates.length > 0 ) {
				const readOperationName = this.readOperationName;
				const readOperation = this.operations[ readOperationName ];
				if ( ! readOperation ) {
					throw new Error( `Operation "${ readOperationName }" not found.` );
				}

				await this.operations[ readOperationName ]( updates );
			}

			this.debug( `Scheduling next update for ${ nextUpdate / 1000 } seconds.` );
			this.updateTimer( now, nextUpdate );
		} else if ( this.timeoutId ) {
			this.debug( 'Unscheduling future updates' );
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
	 * @param {Function} apiOperation The original operation from the apiSpec.
	 * @param {Array} resourceNames The resources upon which to apply the operation.
	 * @param {any} [data] (optional) data to apply via this operation.
	 * @return {Promise} Root promise of operation. Resolves when all requests have resolved.
	 */
	applyOperation = async ( apiOperation, resourceNames, data ) => {
		try {
			this.dataRequested( resourceNames );

			const operationResult = apiOperation( resourceNames, data ) || [];
			const values = isArray( operationResult ) ? operationResult : [ operationResult ];

			const requests = values.map( async ( value ) => {
				const resources = await value;
				this.dataReceived( resources );
				return resources;
			} );

			return await Promise.all( requests );
		} catch ( error ) {
			this.debug( 'Error caught while applying operation: ', apiOperation );
			throw error;
		}
	}

	/**
	 * Sets requested data states for resources.
	 * @param {Array} resourceNames Array of resourceName.
	 * @return {Array} The resourceNames given.
	 */
	dataRequested = ( resourceNames ) => {
		if ( ! this.dataHandlers ) {
			this.debug( 'Data requested before dataHandlers set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataRequested( resourceNames );
		return resourceNames;
	}

	/**
	 * Sets received data states for resources.
	 * @param {Object} resources Data keyed by resourceName.
	 * @return {Object} The resources given.
	 */
	dataReceived = ( resources ) => {
		if ( ! this.dataHandlers ) {
			this.debug( 'Data received before dataHandlers set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataReceived( resources );
		return resources;
	}
}

function mapFunctions( functionsByName, ...params ) {
	return Object.keys( functionsByName ).reduce( ( mappedFunctions, functionName ) => {
		mappedFunctions[ functionName ] = functionsByName[ functionName ]( ...params );
		return mappedFunctions;
	}, {} );
}
