import {
	FRESH_DATA_CLIENT_RECEIVED,
} from './action-types';

export function dataReceived( apiName, clientKey, resources, time = new Date() ) {
	return {
		type: FRESH_DATA_CLIENT_RECEIVED,
		apiName,
		clientKey,
		resources,
		time,
	};
}
