import debugFactory from 'debug';
import { isFunction } from 'lodash';

import calculateUpdates from './calculate-updates';
import { reduceComponentRequirements, reduceRequirement } from './requirements';

const debug = debugFactory( 'fresh-data:api-client' );

export default class ApiClient {
	constructor( api, id ) {
		this.api = api;
		this.id = id;
		this.requirementsByComponent = new Map();
		this.requirementsByEndpoint = {};
		this.state = {};
	}

	setState = ( state ) => {
		this.state = state;
		this.updateRequiredData();
	}

	setComponentRequirements = ( component, requirements ) => {
		debug( `Setting requirements for ${ component.constructor.displayName }: `, requirements );
		this.requirementsByComponent.set( component, requirements );
		this.updateRequirements();
	}

	clearComponentRequirements = ( component ) => {
		debug( `Clearing requirements for ${ component.constructor.displayName }` );
		this.requirementsByComponent.delete( component );
		this.updateRequirements();
		// TODO: Clear out unneeded data?
	}

	selectComponentData = ( component, state, selectFunc ) => {
		const componentRequirements = {};
		const selectors = mapSelectors( this.api.selectors, componentRequirements, state );
		const returnValue = selectFunc( selectors );
		this.setComponentRequirements( component, componentRequirements );
		return returnValue;
	};

	updateRequirements = () => {
		const requirementsByEndpoint = reduceComponentRequirements(
			this.requirementsByEndpoint,
			this.requirementsByComponent
		);

		if ( this.requirementsByEndpoint !== requirementsByEndpoint ) {
			this.requirementsByEndpoint = requirementsByEndpoint;
			this.updateRequiredData();
			debug( 'Updating requirements' );
			console.log( 'requirementsByEndpoint: ', requirementsByEndpoint );
			// TODO: Add schedule update here.
		}
	}

	updateRequiredData = () => {
		const updateInfo = calculateUpdates( this.requirementsByEndpoint, this.state );
		const { updates } = updateInfo;

		debug( 'Updating API requirements: ', updateInfo.updates );

		const endpointNames = Object.keys( updates );
		endpointNames.forEach( name => this.updateEndpointItems( name, updates[ name ] ) );

		// TODO: Set next update.
	}

	// TODO: Remove this.
	updateEndpointItems = ( name, ids ) => {
		const apiEndpoint = this.api.endpoints[ name ];
		const { fetchByIds } = apiEndpoint;

		const params = parseApiParams( fetchByIds.params, { ids } );
		const apiMethod = this.api.methods[ fetchByIds.method ];

		if ( ! isFunction( apiMethod ) ) {
			debug( `API Method ${ fetchByIds.method } not found in api methods.` );
			return;
		}

		// TODO: Add function call that that updates lastRequested in state.
		apiMethod( this.id, name, params );
	}
}

export const mapSelectors = ( selectors, componentRequirements, state ) => {
	return Object.keys( selectors ).reduce( ( mappedSelectors, selectorName ) => {
		mappedSelectors[ selectorName ] = selectors[ selectorName ]( state, requireData( componentRequirements ) );
		return mappedSelectors;
	}, {} );
};

export const requireData = ( componentRequirements ) => ( requirement, endpointName, params ) => {
	console.log( 'requireData( ', requirement, ', ', endpointName, ', ', params, ' )' );
	const endpointRequirements = componentRequirements[ endpointName ] || {};
	const key = JSON.stringify( params );
	endpointRequirements[ key ] = reduceRequirement( endpointRequirements[ key ], requirement );
	componentRequirements[ endpointName ] = endpointRequirements;
};

// TODO: Remove this.
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
