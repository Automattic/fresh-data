import debugFactory from 'debug';
import { reduceEndpointRequirements } from './requirements';
import calculateUpdates from './calculate-updates';

const debug = debugFactory( 'fresh-data:api-client' );

export default class ApiClient {
	constructor( api, key, state = null, dispatch = null ) {
		this.api = api;
		this.key = key;
		this.clientRequirements = {};
		this.setState( state, dispatch );
	}

	setState = ( state, dispatch ) => {
		this.dispatch = dispatch;

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

		debug( 'Updating API requirements: ', updateInfo.updates );

		// TODO: Add code here that calls the API methods and sets the next update.
	}
}

function mapSelectorsToState( selectors, state, requireData ) {
	return Object.keys( selectors ).reduce( ( mappedSelectors, selectorName ) => {
		mappedSelectors[ selectorName ] = selectors[ selectorName ]( state, requireData );
		return mappedSelectors;
	}, {} );
}
