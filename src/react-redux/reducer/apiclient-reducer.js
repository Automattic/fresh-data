import { findIndex } from 'lodash';
import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../action-types';

const defaultState = {
	endpoints: {},
};

const _reducers = {
	[ FRESH_DATA_CLIENT_ERROR ]: reduceError,
	[ FRESH_DATA_CLIENT_RECEIVED ]: reduceReceived,
	[ FRESH_DATA_CLIENT_REQUESTED ]: reduceRequested,
};

/**
 * Primary reducer for fresh-data apiclient data.
 * @param {Object} state The base state for fresh-data.
 * @param {Object} action Action object to be processed.
 * @param {Object} [reducers] The mapping of reducers (used only for test).
 * @return {Object} The new state, or the previous state if this action doesn't belong to fresh-data.
 */
export default function reducer( state = defaultState, action, reducers = _reducers ) {
	const reducerFunc = reducers[ action.type ];
	return reducerFunc ? reducerFunc( state, action ) : state;
}

/**
 * Recursively reduce client endpoint state.
 * 1. If it goes further down the path, recurse.
 * 2. Otherwise if this has params, store it in queries.
 * 3. Otherwise store it on this endpoint state.
 * @param {Function} reducerFunc Reduces the endpoint state, takes ( state, action ).
 * @param {Object} [state] Should contain endpoints property.
 * @param {Object} action { apiName, clientKey, endpointPath, params (optional), data }
 * @param {Array} [path] The remaining path (used for recursion).
 * @return {Object} The new state.
 */
export function reduceEndpointState( reducerFunc ) {
	return function reduceEndpointStateFunc( state, action, path ) {
		const [ endpoint, ...remainingPath ] = path;
		const endpointsState = state.endpoints || {};
		const endpointState = endpointsState[ endpoint ] || {};

		if ( remainingPath.length > 0 ) {
			const subState = reduceEndpointStateFunc( endpointState, action, remainingPath );
			const newEndpointState = { ...endpointState, ...subState };
			const newEndpointsState = { ...endpointsState, [ endpoint ]: newEndpointState };
			const newState = { ...state, endpoints: newEndpointsState };
			return newState;
		}

		const { params } = action;
		if ( params ) {
			const queriesState = endpointState.queries || [];
			const queryIndex = findIndex( queriesState, { params } );
			const queryState = -1 === queryIndex ? {} : queriesState[ queryIndex ];
			const newIndex = -1 === queryIndex ? queriesState.length : queryIndex;
			const newQueryState = reducerFunc( queryState, action );
			const newQueriesState = [ ...queriesState ];
			newQueriesState[ newIndex ] = newQueryState;
			const newEndpointState = {
				...endpointState,
				queries: newQueriesState,
			};
			const newEndpointsState = { ...endpointsState, [ endpoint ]: newEndpointState };
			const newState = { ...state, endpoints: newEndpointsState };
			return newState;
		}

		const newEndpointState = reducerFunc( endpointState, action );
		const newEndpointsState = { ...endpointsState, [ endpoint ]: newEndpointState };
		const newState = { ...state, endpoints: newEndpointsState };
		return newState;
	};
}

export function reduceRequested( state = defaultState, action ) {
	const reducerFunc = ( endpointState, { params, time: lastRequested } ) =>
		( { ...endpointState, params, lastRequested } );

	return reduceEndpointState( reducerFunc )( state, action, action.endpointPath );
}

export function reduceReceived( state = defaultState, action ) {
	const reducerFunc = ( endpointState, { params, data, time: lastReceived } ) =>
		( { ...endpointState, params, data, lastReceived } );

	return reduceEndpointState( reducerFunc )( state, action, action.endpointPath );
}

export function reduceError( state = defaultState, action ) {
	const reducerFunc = ( endpointState, { params, error, time: lastError } ) =>
		( { ...endpointState, params, error, lastError } );

	return reduceEndpointState( reducerFunc )( state, action, action.endpointPath );
}
