import {
	FRESH_DATA_CLIENT_RECEIVED,
} from '../action-types';

const defaultState = {
	resources: {},
};

/**
 * Primary reducer for fresh-data apiclient data.
 * @param {Object} state The base state for fresh-data.
 * @param {Object} action Action object to be processed.
 * @return {Object} The new state, or the previous state if this action doesn't belong to fresh-data.
 */
export default function reducer( state = defaultState, action ) {
	if ( FRESH_DATA_CLIENT_RECEIVED === action.type ) {
		return reduceReceived( state, action );
	}
	return state;
}

export function reduceReceived( state, action ) {
	const { resources: newResources, time: lastReceived } = action;

	const updatedResources = Object.keys( newResources ).reduce( ( resources, resourceName ) => {
		const resource = resources[ resourceName ];
		const newResource = newResources[ resourceName ];
		resources[ resourceName ] = { ...resource, ...newResource, lastReceived };
		return resources;
	}, { ...state.resources } );

	return { ...state, resources: updatedResources };
}
