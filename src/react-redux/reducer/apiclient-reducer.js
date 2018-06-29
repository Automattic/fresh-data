import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../action-types';

const defaultState = {
	resources: {},
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

function reduceResource( state = defaultState, resourceName, data ) {
	const { resources } = state;
	const resource = resources[ resourceName ] || {};
	const newResource = { ...resource, ...data };
	return {
		...state,
		resources: { ...resources, [ resourceName ]: newResource },
	};
}

export function reduceRequested( state = defaultState, action ) {
	const { resourceName, time: lastRequested } = action;
	return reduceResource( state, resourceName, { lastRequested } );
}

export function reduceReceived( state = defaultState, action ) {
	const { resourceName, time: lastReceived, data } = action;
	return reduceResource( state, resourceName, { lastReceived, data } );
}

export function reduceError( state = defaultState, action ) {
	const { resourceName, time: lastError, error } = action;
	return reduceResource( state, resourceName, { lastError, error } );
}
