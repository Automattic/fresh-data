import debugFactory from 'debug';
import isApiValid from '../utils/is-api-valid';

const debug = debugFactory( 'fresh-data:registry' );
const _apis = new Map();

export function registerApi( api, apis = _apis ) {
	debug( `Registering api "${ api && api.name }"` );

	if ( ! isApiValid( api ) ) {
		throw new Error( 'Invalid API object' );
	}
	if ( apis.get( api.name ) ) {
		throw new Error( `API "${ api.name }" already registered` );
	}

	apis.set( api.name, api );
	return apis;
}

