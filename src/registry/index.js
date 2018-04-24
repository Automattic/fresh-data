import debugFactory from 'debug';
import isApiValid from '../utils/is-api-valid';
import ApiClient from '../client';

const debug = debugFactory( 'fresh-data:registry' );
const _apis = new Map();
const _apiClients = new Map();

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

export function getApiClient( key, apis = _apis, apiClients = _apiClients ) {
	const foundApi = apiClients.get( key.api );
	const foundClient = foundApi && foundApi.get( key.id );
	return foundClient || createApiClient( key, apis, apiClients );
}

export function createApiClient( key, apis, apiClients ) {
	debug( 'Creating api client: ', key );
	const api = apis.get( key.api );
	if ( ! api ) {
		debug( `Failed to find registered api named "${ key.api }"` );
		return undefined;
	}
	const client = new ApiClient( api, key.id );
	const foundApi = apiClients.get( key.api ) || new Map();
	foundApi.set( key.id, client );
	apiClients.set( key.api, foundApi );
	return client;
}
