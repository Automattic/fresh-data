import debugFactory from 'debug';
import { isEqual, isEmpty } from 'lodash';
import { combineComponentRequirements } from './requirements';
import { default as getDataFromState } from './get-data';
import requireData from './require-data';
import calculateUpdates from './calculate-updates';

const debug = debugFactory( 'fresh-data:api-client' );

export default class ApiClient {
	constructor( api, key ) {
		this.api = api;
		this.key = key;
		this.requirementsByComponent = new Map();
		this.requirementsByEndpoint = {};
		this.methods = mapMethods( api.methods, key );
		this.timeoutId = null;
		this.setState( {} );
		debug( 'New ApiClient "' + key + '" for api: ', api );
	}

	setState = ( state, now = new Date() ) => {
		if ( this.state !== state ) {
			this.state = state;
			this.updateRequirementsData( now );
		}
	}

	getData = ( endpointPath, params ) => {
		return getDataFromState( this.state )( endpointPath, params );
	};

	setComponentData = ( component, selectorFunc, now = new Date() ) => {
		if ( selectorFunc ) {
			const componentRequirements = [];
			const selectors = mapSelectors( this.api.selectors, this.getData, requireData( componentRequirements ) );
			selectorFunc( selectors );

			this.requirementsByComponent.set( component, componentRequirements );
		} else {
			this.requirementsByComponent.clear( component );
		}

		// TODO: Consider using a reducer style function for endpoint requirements so we don't
		// have to do a deep equals check.
		const requirementsByEndpoint = combineComponentRequirements( this.requirementsByComponent );
		if ( ! isEqual( this.requirementsByEndpoint, requirementsByEndpoint ) ) {
			this.requirementsByEndpoint = requirementsByEndpoint;
			this.updateRequirementsData( now );
		}
	};

	updateRequirementsData = ( now = new Date() ) => {
		const { requirementsByEndpoint, state } = this;
		const endpointsState = state.endpoints;

		if ( endpointsState && ! isEmpty( requirementsByEndpoint ) ) {
			const { nextUpdate, updates } = calculateUpdates( requirementsByEndpoint, endpointsState, now );
			updates.forEach( ( update ) => {
				const { endpointPath, params } = update;
				this.fetchData( endpointPath, params );
			} );
			debug( `Scheduling next update for ${ nextUpdate / 1000 } seconds.` );
			this.setNextUpdate( nextUpdate );
		} else {
			debug( 'Unscheduling future updates' );
			this.setNextUpdate( null );
		}
	}

	setNextUpdate = ( milliseconds ) => {
		if ( this.timeoutId ) {
			clearTimeout( this.timeoutId );
			this.timeoutId = null;
		}

		if ( milliseconds ) {
			this.timeoutId = setTimeout( this.updateRequirementsData, milliseconds );
		}
	}

	fetchData = ( endpointPath, params, endpoints = this.api.endpoints ) => {
		const [ endpointName, ...remainingPath ] = endpointPath;
		const endpoint = endpoints[ endpointName ];

		if ( ! endpoint ) {
			throw new TypeError( `Failed to find required endpoint "${ endpointName }" in api.` );
		}

		if ( remainingPath.length > 0 && endpoint[ remainingPath[ 0 ] ] ) {
			// Looks like we can go down a level in the path.
			return this.fetchData( remainingPath, params, endpoint );
		}

		if ( ! endpoint.read ) {
			throw new TypeError( `Endpoint "${ endpointName }" has no read method.` );
		}

		return endpoint.read( this.methods, remainingPath, params );
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
