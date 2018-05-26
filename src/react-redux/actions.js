import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from './action-types';

export function dataRequested( apiName, clientKey, endpointPath, params, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_REQUESTED,
		apiName,
		clientKey,
		endpointPath,
		params,
		time,
	};
}

export function dataReceived( apiName, clientKey, endpointPath, params, data, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_RECEIVED,
		apiName,
		clientKey,
		endpointPath,
		params,
		data,
		time,
	};
}

export function errorReceived( apiName, clientKey, endpointPath, params, error, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_ERROR,
		apiName,
		clientKey,
		endpointPath,
		params,
		error,
		time,
	};
}
