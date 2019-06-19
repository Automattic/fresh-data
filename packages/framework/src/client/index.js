import debugFactory from 'debug';
import { uniqueId } from 'lodash';
import { updateDevInfo } from '../devinfo';
import Scheduler, { DEFAULT_TIMER_INTERVAL } from './scheduler';

const DEFAULT_READ_OPERATION = 'read';

export default class ApiClient {
	constructor( apiSpec ) {
		const { operations, mutations, selectors } = apiSpec;
		const timerInterval = apiSpec.timerInterval || DEFAULT_TIMER_INTERVAL;
		const readOperationName = apiSpec.readOperationName || DEFAULT_READ_OPERATION;

		this.uid = uniqueId();
		this.name = apiSpec.name;
		this.debug = debugFactory( `fresh-data:api-client[${ this.uid }]` );
		this.debug( 'New ApiClient for apiSpec: ', apiSpec );

		this.dataHandlers = null;
		this.subscriptionCallbacks = new Set();
		this.state = {};

		this.readOperationName = readOperationName;

		this.scheduler = new Scheduler( operations, timerInterval );

		this.selectors = selectors && mapFunctions( selectors, this.getResource, this.requireResource );

		// This is temporary, until mutations are given a breaking change where they do not use operations directly anymore.
		// TODO: Remove mutation operations altogether in favor of mutations returning operations to be scheduled.
		const mutationOperations = operations && Object.keys( operations ).reduce(
			( mappedOperations, operationName ) => {
				mappedOperations[ operationName ] = ( names, data, now ) => {
					this.scheduler.scheduleMutationOperation( operationName, names, data );
				};
				return mappedOperations;
			},
			{}
		);
		this.mutations = mutations && mapFunctions( mutations, mutationOperations );

		updateDevInfo( this );
	}

	getName = () => {
		return this.name || ( 'UID_' + this.uid );
	}

	setDataHandlers = ( { dataRequested, dataReceived } ) => {
		this.scheduler.setDataHandlers( dataRequested, dataReceived );
	}

	setState = ( state ) => {
		if ( this.state !== state ) {
			this.state = state;
			this.subscriptionCallbacks.forEach( ( callback ) => callback( this ) );
			updateDevInfo( this );
		}
	}

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

	requireResource = ( requirement, resourceName, now = new Date() ) => {
		const resources = this.state.resources || {};
		const resourceState = resources[ resourceName ] || {};
		this.scheduler.scheduleRequest( requirement, resourceState, resourceName, this.readOperationName, undefined, now );
		return this.getResource( resourceName );
	};

	getMutations = () => {
		return this.mutations;
	}

	getSelectors = () => {
		return this.selectors;
	}
}

function mapFunctions( functionsByName, ...params ) {
	return Object.keys( functionsByName ).reduce( ( mappedFunctions, functionName ) => {
		mappedFunctions[ functionName ] = functionsByName[ functionName ]( ...params );
		return mappedFunctions;
	}, {} );
}
