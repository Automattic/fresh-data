import debugFactory from 'debug';
import { isEqual } from 'lodash';
import { combineComponentRequirements } from './requirements';
import { default as getDataFromState } from './get-data';
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
			this.updateRequirementsData();
		}
	}

	getData = ( endpointPath, params ) => {
		return getDataFromState( this.state )( endpointPath, params );
	};

	setComponentData = ( component, selectorFunc ) => {
		const componentRequirements = [];
		const selectors = mapSelectors( this.api.selectors, this.getData, requireData( componentRequirements ) );
		selectorFunc( selectors );

		this.requirementsByComponent.set( component, componentRequirements );

		// TODO: Consider using a reducer style function for endpoint requirements so we don't
		// have to do a deep equals check.
		const endpointRequirements = combineComponentRequirements( this.requirementsByComponent );
		if ( ! isEqual( this.endpointRequirements, endpointRequirements ) ) {
			this.endpointRequirements = endpointRequirements;
			this.updateRequirementsData();
		}
	};

	updateRequirementsData = () => {
		// TODO: Actually parse the list of requirements against the current state.
		// TODO: Get a list of requirements that need to be fetched.
		// TODO: Get the next update time.
		// TODO: Set/Reset the timer to update.
	}
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
