import debugFactory from 'debug';
import ApiClient from '../client/index';

const debug = debugFactory( 'fresh-data:api' );

export default class FreshDataApi {
	methods = {};
	operations = {};
	mutations = {};
	selectors = {};

	constructor() {
		// TODO: Validate methods, operations, mutations, and selectors?
		this.client = null;
		this.state = {};
		this.dataHandlers = null;
		this.readOperationName = 'read';
	}

	setDataHandlers = ( { dataRequested, dataReceived } ) => {
		this.dataHandlers = { dataRequested, dataReceived };
	}

	getClient() {
		return this.client || this.createClient();
	}

	createClient() {
		this.client = new ApiClient( this );
		this.client.setState( this.state );
		return this.client;
	}

	updateState( state ) {
		if ( this.state !== state ) {
			if ( this.client ) {
				this.client.setState( state );
			}
			this.state = state;
		}
	}

	/**
	 * Sets requested data states for resources.
	 * @param {Array} resourceNames Array of resourceName.
	 * @return {Array} The resourceNames given.
	 */
	dataRequested( resourceNames ) {
		if ( ! this.dataHandlers ) {
			debug( 'Data requested before dataHandlers set. Disregarding.' );
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
	dataReceived( resources ) {
		if ( ! this.dataHandlers ) {
			debug( 'Data received before dataHandlers set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataReceived( resources );
		return resources;
	}

	/**
	 * Logs an unhandled error from an operation.
	 * @param {string} operationName The name of the operation attempted.
	 * @param {Array} resourceNames The names of resources requested.
	 * @param {any} error The error returned from the operation.
	 * @return {any} The error received.
	 */
	unhandledErrorReceived( operationName, resourceNames, error ) {
		debug(
			`Unhandled error for client operation "${ operationName }":`,
			' resourceNames:', resourceNames,
			' error:', error
		);
		return error;
	}
}
