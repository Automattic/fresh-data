import debugFactory from 'debug';
import getData from './get-data';
import requireData from './require-data';

const debug = debugFactory( 'fresh-data:api-client' );

export default class ApiClient {
	constructor( api, key ) {
		this.api = api;
		this.key = key;
		this.requirementsByComponent = new Map();
		this.requirementsByEndpoint = {};
		this.methods = mapMethods( api.methods, key );
		this.setState( {} );
		debug( 'New ApiClient "' + key + '" for api: ', api );
	}

	setState = ( state ) => {
		if ( this.state !== state ) {
			this.state = state;
			// TODO: Check and update endpoint requirements.
		}
	}

	getData = ( endpointPath, params ) => {
		return getData( this.state )( endpointPath, params );
	};

	selectComponentData = ( component, selectorFunc ) => {
		let componentRequirements = this.requirementsByComponent.get( component );
		if ( ! componentRequirements ) {
			componentRequirements = [];
			this.requirementsByComponent.set( component, componentRequirements );
		}

		const selectors = mapSelectors( this.api.selectors, this.getData, requireData( componentRequirements ) );
		selectorFunc( selectors );

		// TODO: Check if the endpoint requirements have changed and update if they have.
	};
}

function mapMethods( methods, clientKey ) {
	return Object.keys( methods ).reduce( ( mappedMethods, methodName ) => {
		mappedMethods[ methodName ] = methods[ methodName ]( clientKey );
		return mappedMethods;
	}, {} );
}

function mapSelectors( selectors, clientGetData, clientRequireData ) {
	return Object.keys( selectors ).reduce( ( mappedSelectors, selectorName ) => {
		mappedSelectors[ selectorName ] = selectors[ selectorName ]( clientGetData, clientRequireData );
		return mappedSelectors;
	}, [] );
}
