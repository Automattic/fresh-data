import {
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../action-types';

const defaultState = {
	resources: {},
};

const _reducers = {
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

export function reduceRequested( state = defaultState, action ) {
	const { resourceNames, time: lastRequested } = action;

	const updatedResources = resourceNames.reduce( ( resources, resourceName ) => {
		const resource = resources[ resourceName ];
		resources[ resourceName ] = { ...resource, lastRequested };
		return resources;
	}, { ...state.resources } );

	return { ...state, resources: updatedResources };
}

export function reduceReceived( state = defaultState, action ) {
	const { resources: newResources, time: lastReceived } = action;

	const updatedResources = Object.keys( newResources ).reduce( ( resources, resourceName ) => {
		const resource = resources[ resourceName ];
		const newResource = newResources[ resourceName ];
		resources[ resourceName ] = { ...resource, ...newResource, lastReceived };
		return resources;
	}, { ...state.resources } );

	return { ...state, resources: updatedResources };
}
