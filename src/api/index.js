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
		this.dataHandlers = {};
		this.readOperationName = 'read';

		// TODO: Validate methods, resources, selectors here.
		this.methods = this.constructor.methods;
		this.operations = this.constructor.operations;
		this.selectors = this.constructor.selectors;
		this.mutations = this.constructor.mutations;
	}

	setDataHandlers = ( dataRequested, dataReceived ) => {
		this.dataHandlers = { dataRequested, dataReceived };
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
	 * Sets requested timestamps resources.
	 * @param {string} clientKey The clientKey for the api instance.
	 * @param {Array} resourceNames The names of resources requested.
	 */
	dataRequested( clientKey, resourceNames ) {
		if ( ! this.dataHandlers.dataRequested ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataRequested( this, clientKey, resourceNames );
	}

	/**
	 * Sets received data states for resources.
	 * @param {string} clientKey The clientKey for the api instance.
	 * @param {Object} resources Data keyed by resourceName.
	 */
	dataReceived( clientKey, resources ) {
		if ( ! this.dataHandlers.dataReceived ) {
			debug( 'Data received before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataReceived( this, clientKey, resources );
	}
}
