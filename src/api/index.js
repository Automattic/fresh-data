import ApiClient from '../client';
import debugFactory from 'debug';

const debug = debugFactory( 'fresh-data:api' );

export default class FreshDataApi {
	static methods = {}
	static endpoints = {}
	static selectors = {}

	constructor() {
		this.clients = new Map();
		this.state = {};
		this.dataHandlers = {};

		// TODO: Validate methods, endpoints, selectors here.
		this.methods = this.constructor.methods;
		this.endpoints = this.constructor.endpoints;
		this.selectors = this.constructor.selectors;
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

	dataRequested( clientKey, endpointPath, params ) {
		if ( ! this.dataHandlers.dataRequested ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataRequested( this, clientKey, endpointPath, params );
	}

	dataReceived( clientKey, endpointPath, params, data ) {
		if ( ! this.dataHandlers.dataReceived ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.dataReceived( this, clientKey, endpointPath, params, data );
	}

	errorReceived( clientKey, endpointPath, params, error ) {
		if ( ! this.dataHandlers.errorReceived ) {
			debug( 'Data requested before dataHandlers were set. Disregarding.' );
			return;
		}
		this.dataHandlers.errorReceived( this, clientKey, endpointPath, params, error );
	}
}
