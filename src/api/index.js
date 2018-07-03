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

	setDataHandlers = ( dataRequested, dataReceived, errorReceived ) => {
		this.dataHandlers = { dataRequested, dataReceived, errorReceived };
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

	dataRequested( clientKey, resourceName ) {
		if ( ! this.dataHandlers.dataRequested ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataRequested( this, clientKey, resourceName );
	}

	dataReceived( clientKey, resourceName, data ) {
		if ( ! this.dataHandlers.dataReceived ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataReceived( this, clientKey, resourceName, data );
	}

	errorReceived( clientKey, resourceName, error ) {
		if ( ! this.dataHandlers.errorReceived ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.errorReceived( this, clientKey, resourceName, error );
	}
}
