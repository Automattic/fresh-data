import {
	FRESH_DATA_RECEIVED,
	FRESH_DATA_REQUESTED,
} from './action-types';

export function dataRequested( apiName, resourceNames, time = new Date() ) {
	return {
		type: FRESH_DATA_REQUESTED,
		apiName,
		resourceNames,
		time,
	};
}

export function dataReceived( apiName, resources, time = new Date() ) {
	return {
		type: FRESH_DATA_RECEIVED,
		apiName,
		resources,
		time,
	};
}
