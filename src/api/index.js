import debugFactory from 'debug';
import ApiClient from '../client/index';

const debug = debugFactory( 'fresh-data:api' );

export default class FreshDataApi {
	// TODO: Consider making these part of the instance instead of the class.
	// It would allow the use of `this` to retrieve things like methods and resources.
	static methods = {}
	static operations = {}
	static selectors = {}
	static mutations = {}

	constructor() {
		this.clients = new Map();
		this.state = {};
		this.dataHandler = null;
		this.readOperationName = 'read';

		// TODO: Validate methods, resources, selectors here.
		this.methods = this.constructor.methods;
		this.operations = this.constructor.operations;
		this.selectors = this.constructor.selectors;
		this.mutations = this.constructor.mutations;
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
