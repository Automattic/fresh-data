import qs from 'qs';
import { getResourceIdentifier, getResourceName, isResourcePrefix } from './utils';

const BASE_URL = 'https://api.github.com/';

export function createApiSpec( fetch = window.fetch ) {
	return {
		operations: {
			read( resourceNames ) {
				return [
					...readUsers( resourceNames, fetch ),
					...readUsersStars( resourceNames, fetch ),
				];
			},
		},
		selectors: {
			isLoadingUser: ( getResource ) => ( userName ) => {
				const resourceName = getResourceName( 'user', userName );
				const resource = getResource( resourceName );
				return ( ! resource.data ) && resource.lastRequested;
			},

			getUser: ( getResource, requireResource ) => ( requirement, userName ) => {
				const resourceName = getResourceName( 'user', userName );
				const resource = requireResource( requirement, resourceName );
				return resource.data || null;
			},

			getUserStars: ( getResource, requireResource ) => ( requirement, userName ) => {
				const resourceName = getResourceName( 'user-stars', userName );
				const resource = requireResource( requirement, resourceName );
				return resource.data || null;
			}
		},
	};
}

function readUsers( resourceNames, fetch ) {
	const filteredNames = resourceNames.filter( name => isResourcePrefix( name, 'user' ) );
	return filteredNames.map( name => readUser( name, fetch ) );
}

function readUser( resourceName, fetch ) {
	const userName = getResourceIdentifier( resourceName );

	return httpGet( fetch, [ 'users', userName ] ).then( ( data ) => {
		return { [ resourceName ]: { data } };
	} );
}

function readUsersStars( resourceNames, fetch ) {
	const filteredNames = resourceNames.filter( name => isResourcePrefix( name, 'user-stars' ) );
	return filteredNames.map( name => readUserStars( name, fetch ) );
}

function readUserStars( resourceName, fetch ) {
	const userName = getResourceIdentifier( resourceName );

	return httpGet( fetch, [ 'users', userName, 'starred' ] ).then( ( data ) => {
		return { [ resourceName ]: { data } };
	} );
}

async function httpGet( fetch, path, params ) {
	const urlPath = path.join( '/' );
	const queryString = params ? `?${ qs.stringify( params ) }` : '';
	const url = `${ BASE_URL }${ urlPath }${ queryString }`;
	const response = await fetch( url );
	return response.json();
}

export default createApiSpec();
