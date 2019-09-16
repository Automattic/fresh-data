import debugFactory from 'debug';
import { uniqueId } from 'lodash';
import { updateDevInfo } from '../devinfo';
import Scheduler from './scheduler';

const DEFAULT_READ_OPERATION = 'read';

/**
 * ApiClient class
 *
 * An instance of this class represents an active connection to an API with a set of resources scheduled to be fetched.
 */
export default class ApiClient {
	/**
	 * Creates an API Client from an API Spec
	 *
	 * @param {Object} apiSpec The specification for this client, contains operations, selectors, mutations
	 * @param {Document} appDocument The application document to be used, defaults to global document
	 */
	constructor( apiSpec, appDocument = document ) {
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

		if ( appDocument ) {
			this.setVisibilityListener( appDocument );
		}

		updateDevInfo( this );
	}

	/**
	 * Gets the name of this API client.
	 *
	 * @return {string} The name of the API spec or a randomly generated name.
	 */
	getName = () => {
		return this.name || ( 'UID_' + this.uid );
	}

	/**
	 * Sets the visibility listener for this client.
	 *
	 * This is used to prevent requests when the document is not visible.
	 * This usually happens when another tab is active, or another workspace.
	 *
	 * See https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
	 *
	 * @param {Document} appDocument The document object (defaults to window.document)
	 */
	setVisibilityListener = ( appDocument ) => {
		appDocument.addEventListener( 'visibilitychange', () => {
			const isHidden = ( 'hidden' === appDocument.visibilityState );

			if ( isHidden ) {
				this.debug( 'App has become hidden, cancelling updates until visible again.' );
				this.scheduler.stop();
			} else {
				this.debug( 'App has become visible again, scheduling next update.' );
				this.scheduler.updateDelay();
			}
		} );
	}

	/**
	 * Sets the data handlers for this client.
	 *
	 * TODO: This function will no longer be necessary when redux state is simplified out.
	 *
	 * @param {Object} dataHandlers contains functions for `dataRequested` and `dataReceived`.
	 */
	setDataHandlers = ( { dataRequested, dataReceived } ) => {
		this.scheduler.setDataHandlers( ( resourceNames ) => {
			this.isClientStateInSync = false;
			dataRequested( resourceNames );
		}, ( resources ) => {
			this.isClientStateInSync = false;
			dataReceived( resources );
		} );
	}

	/**
	 * Sets the state of this client.
	 *
	 * TODO: Remove this function after removing redux requirement.
	 *
	 * @param {Object} state The new state for the client.
	 */
	setState = ( state ) => {
		if ( this.state === state ) {
			return;
		}

		this.state = state;
		this.isClientStateInSync = true;
		this.subscriptionCallbacks.forEach( ( callback ) => callback( this ) );
		updateDevInfo( this );
	}

	/**
	 * Subscribe to changes in the client state.
	 *
	 * @param {Function} callback The function to be called when any client resource state changes.
	 * @return {Function} The callback given, or false if already subscribed.
	 */
	subscribe = ( callback ) => {
		if ( this.subscriptionCallbacks.has( callback ) ) {
			this.debug( 'Attempting to add a subscription callback twice:', callback );
			return false;
		}
		this.subscriptionCallbacks.add( callback );
		return callback;
	}

	/**
	 * Unsubscribe from changes in the client state.
	 *
	 * @param {Function} callback The callback to be unsubscribed.
	 * @return {Function} The callback given, or false if not subscribed.
	 */
	unsubscribe = ( callback ) => {
		if ( ! this.subscriptionCallbacks.has( callback ) ) {
			this.debug( 'Attempting to remove a callback that is not subscribed:', callback );
			return false;
		}
		this.subscriptionCallbacks.delete( callback );
		return callback;
	}

	/**
	 * Gets a resource and optionally requires it.
	 *
	 * @param {string} resourceName The name of the resource to retrieve.
	 * @param {Object} [requirement] Optional requirements object. e.g. `{ freshness: 15 * MINUTE }`
	 * @param {Date} [now] Date as of now (for testing)
	 * @return {Object} The resource object for the given name, or undefined if none.
	 */
	getResource = ( resourceName, requirement = false, now = new Date() ) => {
		const resources = this.state.resources || {};
		const resourceState = resources[ resourceName ] || {};

		if ( requirement ) {
			// TODO: Remove this check after redux state is simplified out.
			// This is necessary because components are getting re-rendered twice when dataReceived is dispatched.
			// First before the state is updated, and second afterwards. This prevents resources from getting rescheduled
			// on the first re-render. After redux dispatching is no longer used, components should no longer re-render twice.
			if ( this.isClientStateInSync ) {
				this.scheduler.scheduleRequest( requirement, resourceState, resourceName, this.readOperationName, undefined, now );
			}
		}
		return resourceState;
	};

	/**
	 * Requires a resource and returns it.
	 *
	 * This function is deprecated. Use `getResource()` instead.
	 *
	 * @deprecated in 0.8.0
	 *
	 * @param {Object} [requirement] Optional requirements object. e.g. `{ freshness: 15 * MINUTE }`
	 * @param {string} resourceName The name of the resource to retrieve.
	 * @param {Date} [now] Date as of now (for testing)
	 * @return {Object} The resource object for the given name, or undefined if none.
	 */
	requireResource = ( requirement, resourceName, now = new Date() ) => {
		// TODO: Add link to github readme doc in message below.
		console.warn( 'fresh-data requireResource is deprecated, use getResource instead' ); // eslint-disable-line no-console

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

	/**
	 * Gets the mutations from the API Spec.
	 *
	 * @return {Object} The set of mutations given in the `apiSpec` when creating this api client.
	 */
	getMutations = () => {
		return this.mutations;
	}

	/**
	 * Gets the selectors from the API Spec.
	 *
	 * @return {Object} The set of selectors given in the `apiSpec` when creating this api client.
	 */
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
