import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from './action-types';

export function dataRequested( apiName, clientKey, resourceName, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_REQUESTED,
		apiName,
		clientKey,
		resourceName,
		time,
	};
}

export function dataReceived( apiName, clientKey, resourceName, data, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_RECEIVED,
		apiName,
		clientKey,
		resourceName,
		data,
		time,
	};
}

export function errorReceived( apiName, clientKey, resourceName, error, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_ERROR,
		apiName,
		clientKey,
		resourceName,
		error,
		time,
	};
}
