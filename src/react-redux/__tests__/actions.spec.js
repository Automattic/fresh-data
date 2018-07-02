import {
	dataRequested,
	dataReceived,
} from '../actions';
import {
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../action-types.js';

describe( 'actions', () => {
	const apiName = 'myApiName';
	const clientKey = 'myClientKey';
	const resourceNames = [ 'thing:1', 'thing:2' ];
	const resources = {
		'thing:1': { data: { attributes: { attr1: '1', attr2: '2', attr3: 3 } } },
		'thing:2': { error: { message: 'oops!' } }
	};
	const time = new Date();

	describe( 'dataRequested', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = dataRequested( apiName, clientKey, resourceNames, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_CLIENT_REQUESTED,
				apiName,
				clientKey,
				resourceNames,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = dataRequested( apiName, clientKey, resourceNames );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );

	describe( 'dataReceived', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = dataReceived( apiName, clientKey, resources, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName,
				clientKey,
				resources,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = dataReceived( apiName, clientKey, resources );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );
} );
