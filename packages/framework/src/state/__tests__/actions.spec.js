import { dataReceived, dataRequested } from '../actions';
import { FRESH_DATA_RECEIVED, FRESH_DATA_REQUESTED } from '../action-types.js';

describe( 'actions', () => {
	const apiName = 'myApiName';
	const resourceNames = [ 'thing:1', 'thing:2' ];
	const resources = {
		'thing:1': { data: { attributes: { attr1: '1', attr2: '2', attr3: 3 } } },
		'thing:2': { error: { message: 'oops!' } }
	};
	const time = new Date();

	describe( 'dataRequested', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = dataRequested( apiName, resourceNames, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_REQUESTED,
				apiName,
				resourceNames,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = dataRequested( apiName, resourceNames );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );

	describe( 'dataReceived', () => {
		it( 'should create a simple action object with expected fields.', () => {
			const action = dataReceived( apiName, resources, time );
			expect( action ).toEqual( {
				type: FRESH_DATA_RECEIVED,
				apiName,
				resources,
				time,
			} );
		} );

		it( 'should set a default time if none given.', () => {
			const action = dataReceived( apiName, resources );
			expect( action.time ).toBeInstanceOf( Date );
		} );
	} );
} );
