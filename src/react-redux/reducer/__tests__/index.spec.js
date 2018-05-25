import reducer from '../index';
import { FRESH_DATA_CLIENT_REQUESTING } from '../../action-types';

describe( 'reducer', () => {
	const now = new Date();

	it( 'should initialize to an empty object', () => {
		const state = reducer( undefined, { type: '%%TEST_ACTION%%' } );
		expect( state ).toEqual( {} );
	} );

	it( 'should pass through state for an unknown action.', () => {
		const state1 = { test: '123' };
		const state2 = reducer( state1, { type: '%%TEST_ACTION%%' } );
		expect( state2 ).toBe( state1 );
	} );

	it( 'should pass down an apiclient state to the apiclient reducer', () => {
		const state1 = {
			testApi: {
				123: {
					endpoints: {
						things: {},
					},
				},
			},
		};
		const requestingAction = {
			type: FRESH_DATA_CLIENT_REQUESTING,
			apiName: 'testApi',
			clientKey: '123',
			endpointPath: [ 'things', 1 ],
			time: now,
		};
		const requestingReducer = jest.fn();
		requestingReducer.mockReturnValue(
			{ endpoints: { things: { endpoints: { 1: { lastRequested: now } } } } }
		);
		const state2 = reducer( state1, requestingAction, [ requestingReducer ] );

		expect( requestingReducer ).toHaveBeenCalledTimes( 1 );
		expect( requestingReducer ).toHaveBeenCalledWith( state1.testApi[ 123 ], requestingAction );
		expect( state2.testApi[ 123 ].endpoints.things.endpoints[ 1 ].lastRequested ).toEqual( now );
	} );
} );
