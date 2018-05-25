import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from './action-types';

const _reducers = {
	[ FRESH_DATA_CLIENT_ERROR ]: reduceError,
	[ FRESH_DATA_CLIENT_RECEIVED ]: reduceReceived,
	[ FRESH_DATA_CLIENT_REQUESTED ]: reduceRequested,
};

export default function reduceFreshData( state = {}, action, reducers = _reducers ) {
	const reducer = reducers[ action.type ];

	if ( reducer ) {
		const { apiName, clientKey, endpoint } = action;
		return nestReducer( [ apiName, clientKey, endpoint ], reducer, state, action );
	}

	return state;
}

export function nestReducer( keys, reducer, state, action ) {
	if ( keys.length ) {
		const key = keys[ 0 ];
		const keyState = state ? state[ key ] : undefined;
		const newKeyState = nestReducer( keys.slice( 1 ), reducer, keyState, action );
		return { ...state, [ key ]: newKeyState };
	}
	return reducer( state, action );
}

export function reduceError( endpointState, action ) {
	const { ids, error } = action;
	return reduceEndpointValue( endpointState, ids, 'error', error );
}

export function reduceReceived( endpointState = {}, action ) {
	const { data } = action;
	const ids = Object.keys( data );
	const time = action.time || new Date();

	// Convert array of ids to updated items.
	const requestedItems = ids.reduce( ( items, id ) => {
		items[ id ] = {
			...endpointState[ id ],
			lastReceived: time,
			data: data[ id ]
		};
		return items;
	}, {} );

	return { ...endpointState, ...requestedItems };
}

export function reduceRequested( endpointState, action ) {
	const { ids } = action;
	const time = action.time || new Date();
	return reduceEndpointValue( endpointState, ids, 'lastRequested', time );
}

function reduceEndpointValue( endpointState = {}, ids, name, value ) {
	// Convert array of ids to updated items.
	const requestedItems = ids.reduce( ( items, id ) => {
		items[ id ] = { ...endpointState[ id ], [ name ]: value };
		return items;
	}, {} );

	return { ...endpointState, ...requestedItems };
}
