import debugFactory from 'debug';
import { uniqueId } from 'lodash';
import { updateDevInfo } from '../devinfo';
import Scheduler from './scheduler';

const DEFAULT_READ_OPERATION = 'read';

export default class ApiClient {
	constructor( apiSpec ) {
		const { operations, mutations, selectors } = apiSpec;
		const readOperationName = apiSpec.readOperationName || DEFAULT_READ_OPERATION;

		this.uid = uniqueId();
		this.name = apiSpec.name;
		this.debug = debugFactory( `fresh-data:api-client[${ this.uid }]` );
		this.debug( 'New ApiClient for apiSpec: ', apiSpec );

		this.dataHandlers = null;
		this.subscriptionCallbacks = new Set();
		this.state = {};
		// TODO: This will no longer be necessary when redux state is simplified out.
		// This variable is used to keep track of the moment
		// between the data handler being called and the new state being set on the client.
		// During this moment, no requests should be scheduled because they'd be working on timestamps that are out of date.
		this.isClientStateInSync = false;

		this.readOperationName = readOperationName;

		this.scheduler = new Scheduler( operations );

		this.selectors = selectors && mapFunctions( selectors, this.getResource, this.requireResource );

		// This is temporary, until mutations are given a breaking change where they do not use operations directly anymore.
		// TODO: Remove mutation operations altogether in favor of mutations returning operations to be scheduled.
		const mutationOperations = operations && Object.keys( operations ).reduce(
			( mappedOperations, operationName ) => {
				mappedOperations[ operationName ] = ( names, data ) => {
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

	// TODO: This function will no longer be necessary when redux state is simplified out.
	setDataHandlers = ( { dataRequested, dataReceived } ) => {
		this.scheduler.setDataHandlers( ( resourceNames ) => {
			this.isClientStateInSync = false;
			dataRequested( resourceNames );
		}, ( resources ) => {
			this.isClientStateInSync = false;
			dataReceived( resources );
		} );
	}

	setState = ( state ) => {
		if ( this.state !== state ) {
			this.state = state;
			this.subscriptionCallbacks.forEach( ( callback ) => callback( this ) );
			updateDevInfo( this );
		}
		this.isClientStateInSync = true;
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
		// TODO: Remove this check after redux state is simplified out.
		// This is necessary because components are getting re-rendered twice when dataReceived is dispatched.
		// First before the state is updated, and second afterwards. This prevents resources from getting rescheduled
		// on the first re-render. After redux dispatching is no longer used, components should no longer re-render twice.
		if ( this.isClientStateInSync ) {
			this.scheduler.scheduleRequest( requirement, resourceState, resourceName, this.readOperationName, undefined, now );
		}
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
