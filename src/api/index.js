import debugFactory from 'debug';
import ApiClient from '../client/index';

const debug = debugFactory( 'fresh-data:api' );

export default class FreshDataApi {
	constructor( methods = {}, operations = {}, mutations = {}, selectors = {} ) {
		// TODO: Validate things coming in from the constructo?
		this.methods = methods;
		this.operations = operations;
		this.mutations = mutations;
		this.selectors = selectors;
		this.clients = new Map();
		this.state = {};
		this.dataHandler = null;
		this.readOperationName = 'read';
	}

	setDataHandler = ( dataHandler ) => {
		this.dataHandler = dataHandler;
	}

	getClient( clientKey ) {
		return this.findClient( clientKey ) || this.createClient( clientKey );
	}

	findClient( clientKey ) {
		return this.clients.get( clientKey ) || null;
	}

	createClient( clientKey ) {
		const client = new ApiClient( this, clientKey );
		this.clients.set( clientKey, client );
		client.setState( this.state );
		return client;
	}

	updateState( state ) {
		if ( this.state !== state ) {
			this.clients.forEach( ( client, clientKey ) => {
				const clientState = state[ clientKey ] || {};
				if ( client.state !== clientState ) {
					client.setState( clientState );
				}
			} );
			this.state = state;
		}
	}

	/**
	 * Sets received data states for resources.
	 * @param {string} clientKey The clientKey for the api instance.
	 * @param {Object} resources Data keyed by resourceName.
	 */
	dataReceived( clientKey, resources ) {
		if ( ! this.dataHandler ) {
			debug( 'Data received before dataHandler set. Disregarding.' );
			return;
		}
		this.dataHandler( this, clientKey, resources );
	}

	/**
	 * Logs an unhandled error from an operation.
	 * @param {string} clientKey The clientKey for the api instance.
	 * @param {string} operationName The name of the operation attempted.
	 * @param {Array} resourceNames The names of resources requested.
	 * @param {any} error The error returned from the operation.
	 */
	unhandledErrorReceived( clientKey, operationName, resourceNames, error ) {
		debug(
			`Unhandled error for client "${ clientKey }", operation "${ operationName }":`,
			' resourceNames:', resourceNames,
			' error:', error
		);
	}
}
