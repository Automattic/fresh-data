import debugFactory from 'debug';
import { get, isArray, uniqueId } from 'lodash';
import { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from './calculate-updates';
import Scheduler from './scheduler';

const DEFAULT_READ_OPERATION = 'read';

export default class ApiClient {
	constructor( apiSpec, /*setTimer = _setTimer, clearTimer = _clearTimer*/ ) {
		const { operations, mutations, selectors } = apiSpec;
		const readOperationName = apiSpec.readOperationName || DEFAULT_READ_OPERATION;

		this.uid = uniqueId();
		this.name = apiSpec.name;
		this.debug = debugFactory( `fresh-data:api-client[${ this.uid }]` );
		this.debug( 'New ApiClient for apiSpec: ', apiSpec );

		this.operations = operations && this.mapOperations( operations );
		this.mutations = mutations && mapFunctions( mutations, this.operations );
		this.selectors = selectors;

		if ( this.operations && this.operations[ readOperationName ] ) {
			this.scheduler = new Scheduler( this.operations[ readOperationName ] );
		} else {
			this.scheduler = new Scheduler( () => {
				throw new Error( `Operation "${ readOperationName }" not found.` );
			} );
		}

		this.dataHandlers = null;
		this.subscriptionCallbacks = new Set();
		this.minUpdate = DEFAULT_MIN_UPDATE;
		this.maxUpdate = DEFAULT_MAX_UPDATE;
		this.state = {};

		//updateDevInfo( this );
	}

	getName = () => {
		return this.name || ( 'UID_' + this.uid );
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
			//this.updateTimer( now );
			this.subscriptionCallbacks.forEach( ( callback ) => callback( this ) );
			//updateDevInfo( this );
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

	getSelectors = ( componentRequirements ) => {
		return mapFunctions( this.selectors, this.getResource, this.requireResource( componentRequirements ) );
	}

	clearComponentRequirements = ( component, now = new Date() ) => {
		console.log( '************ clearComponentRequirements: ', component );
	}

	setComponentRequirements = ( component, componentRequirements, now = new Date() ) => {
		componentRequirements.forEach( ( componentRequirement ) => {
			const { resourceName, ...requirement } = componentRequirement;
			const resourceState = get( this.state, [ 'resources', resourceName ], {} );
			this.scheduler.scheduleRequest( resourceName, requirement, resourceState, now );
		} );
	}

	setComponentData = ( component, selectorFunc, now = new Date() ) => {
		if ( selectorFunc ) {
			const componentRequirements = [];
			const selectors = this.getSelectors( componentRequirements );
			selectorFunc( selectors );

			this.setComponentRequirements( component, componentRequirements, now );
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
