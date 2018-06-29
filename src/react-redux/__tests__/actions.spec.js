import {
	dataRequested,
	dataReceived,
	errorReceived,
} from '../actions';
import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../action-types.js';

describe( 'actions', () => {
	const apiName = 'myApiName';
	const clientKey = 'myClientKey';
	const resourceName = 'one-two-three:{ param1: "one", param2: "two" }';
	const data = { attributes: { attr1: '1', attr2: '2', attr3: 3 } };
	const error = { message: 'oops!' };
	const time = new Date();

	describe( 'dataRequested', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = dataRequested( apiName, clientKey, resourceName, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_CLIENT_REQUESTED,
				apiName,
				clientKey,
				resourceName,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = dataRequested( apiName, clientKey, resourceName );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );

	describe( 'dataReceived', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = dataReceived( apiName, clientKey, resourceName, data, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName,
				clientKey,
				resourceName,
				data,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = dataReceived( apiName, clientKey, resourceName, data );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );

	describe( 'errorReceived', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = errorReceived( apiName, clientKey, resourceName, error, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_CLIENT_ERROR,
				apiName,
				clientKey,
				resourceName,
				error,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = errorReceived( apiName, clientKey, resourceName, error );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );
} );
