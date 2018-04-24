import { isArray, isNumber, merge, uniq } from 'lodash';

const endpoints = {
	noun: {
		read: ( methods, requests ) => {
			console.log( 'noun read: ', requests );
		},
	},

	products: {
		read: ( methods, requests ) => {
			// Make one API request for all ids that we need.
			const idRequests = requests.filter( request => isArray( request.ids ) );
			const mergedIdRequest = merge( ...idRequests );
			const uniqueIds = uniq( mergedIdRequest.ids );
			methods.get( 'products', { include: uniqueIds } );

			// For each "page" required, make a separate request.
			const pageRequests = requests.filter( request => isNumber( request.page ) );
			pageRequests.forEach( ( request ) => {
				// eslint-disable-next-line camelcase
				methods.get( 'products', { page: request.page, per_page: request.perPage } );
			} );
		},
	},
};

const selectors = {
	getNoun: ( apiClientState, requireData ) => ( requirements ) => {
		requireData( requirements, 'noun', { bogusParam: true } );

		const { noun } = apiClientState;
		return noun ? noun.data : null;
	},

	getProductsByIds: ( apiClientState, requireData ) => ( requirements, ids ) => {
		requireData( requirements, 'products', { ids } );

		const { products } = apiClientState;
		const productsById = products && products.byId ? products.byId.data : {};
		return ids.map( id => productsById[ id ] || null );
	},

	getProductsByQuery: ( apiClientState, requireData ) => ( requirements, queryParams ) => {
		requireData( requirements, 'products', queryParams );

		const queryString = JSON.stringify( queryParams );
		const { products } = apiClientState;
		const queries = products && products.queries ? products.queries : {};
		const queryIds = queries && queries[ queryString ] ? products.queries[ queryString ].ids : [];
		const productsById = products && products.byId ? products.byId.data : {};
		return queryIds.map( id => productsById[ id ] || null );
	}
};

export default function createTestApi( methods ) {
	return {
		name: 'test-api',
		methods,
		endpoints,
		selectors,
	};
}
