import debugFactory from 'debug';
import { isEmpty } from 'lodash';

import calculateUpdates from './calculate-updates';
import { reduceEndpointRequirements } from './requirements';

const debug = debugFactory( 'fresh-data:api-client' );

export default class ApiClient {
	constructor( api, key, state = null ) {
		this.api = api;
		this.key = key;
		this.clientRequirements = {};
		this.setState( state );
	}

	setState = ( state ) => {
		if ( this.state !== state ) {
			const { selectors } = this.api;
			this.state = state;
			this.selectors = mapSelectorsToState( selectors, state, this.requireData );
		}
	}

	// TODO: Add code to clear out data requirements on re-render.
	requireData = ( endpointName, ids, requirements ) => {
		const oldEndpointReqs = this.clientRequirements[ endpointName ] || {};
		const newEndpointReqs = reduceEndpointRequirements( oldEndpointReqs, ids, requirements );

		if ( oldEndpointReqs !== newEndpointReqs ) {
			this.clientRequirements[ endpointName ] = newEndpointReqs;
			this.updateRequirements();
		}
	}

	updateRequirements = () => {
		const updateInfo = calculateUpdates( this.clientRequirements, this.state );
		const { updates } = updateInfo;

		debug( 'Updating API requirements: ', updateInfo.updates );

		// Only perform updates if we have a dispatch function to do it.
		if ( this.dispatch && ! isEmpty( updates ) > 0 ) {
			const endpointNames = Object.keys( updates );
			endpointNames.forEach( name => this.updateEndpointItems( name, updates[ name ] ) );
		}

		// TODO: Set next update.
	}

	updateEndpointItems = ( name, ids ) => {
		const apiEndpoint = this.api.endpoints[ name ];
		const { fetchByIds } = apiEndpoint;

		const params = parseApiParams( fetchByIds.params, { ids } );
		const createAction = this.api.methods[ fetchByIds.method ];
		const requestAction = createAction( this.key, name, params );

		// TODO: Add actions that update lastRequested in state.
		//this.dispatch( requestedAction( this.siteKey, name, ids ) );
		this.dispatch( requestAction );
	}
}

export function parseApiParams( methodParams, paramData ) {
	return Object.keys( methodParams ).reduce( ( params, key ) => {
		const dataName = methodParams[ key ];
		const data = paramData[ dataName ];
		if ( data ) {
			params[ key ] = data;
		} else {
			debug( 'Missing data "' + dataName + '"' );
		}
		return params;
	}, {} );
}

function mapSelectorsToState( selectors, state, requireData ) {
	return Object.keys( selectors ).reduce( ( mappedSelectors, selectorName ) => {
		mappedSelectors[ selectorName ] = selectors[ selectorName ]( state, requireData );
		return mappedSelectors;
	}, {} );
}
