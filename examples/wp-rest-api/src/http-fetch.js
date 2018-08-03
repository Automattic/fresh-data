import qs from 'qs';

export const get = ( fetch, baseUrl ) => ( endpointPath, params ) => {
	const path = endpointPath.join( '/' );
	const httpParams = { page: params.page, per_page: params.perPage }; // eslint-disable-line camelcase
	const url = `${ baseUrl }/${ path }${ httpParams ? '?' + qs.stringify( httpParams ) : '' }`;

	return fetch( url ).then( ( response ) => {
		if ( ! response.ok ) {
			throw new Error( `HTTP Error for ${ response.url }: ${ response.status }` );
		}
		return response.json().then( ( data ) => {
			return data;
		} );
	} );
};

export default ( baseUrl, fetch = window.fetch ) => {
	return {
		get: get( fetch, baseUrl ),
	};
};
