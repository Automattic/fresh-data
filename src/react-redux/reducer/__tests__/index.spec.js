import reducer from '../index';
import { FRESH_DATA_RECEIVED } from '../../action-types';

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
				resources: {
					'thing:1': { lastRequested: now - 2000 },
				},
			},
		};
		const action = {
			type: FRESH_DATA_RECEIVED,
			apiName: 'testApi',
			resources: {
				'thing:1': { lastReceived: now, data: { foot: 'red' } },
				'thing:2': { lastReceived: now, data: { foot: 'blue' } },
			},
		};
		const reducerMock = jest.fn();
		reducerMock.mockReturnValue(
			{
				resources: {
					'thing:1': { lastRequested: now - 2000, lastReceived: now, data: { foot: 'red' } },
					'thing:2': { lastReceived: now, data: { foot: 'blue' } },
				}
			}
		);
		const state2 = reducer( state1, action, [ reducerMock ] );

		expect( reducerMock ).toHaveBeenCalledTimes( 1 );
		expect( reducerMock ).toHaveBeenCalledWith( state1.testApi, action );
		expect( state2.testApi.resources[ 'thing:1' ].lastRequested ).toEqual( now - 2000 );
		expect( state2.testApi.resources[ 'thing:1' ].lastReceived ).toEqual( now );
		expect( state2.testApi.resources[ 'thing:2' ].lastReceived ).toEqual( now );
	} );

	it( 'should create a new sub state for the sub reducer', () => {
		const state1 = {};
		const action = {
			type: FRESH_DATA_RECEIVED,
			apiName: 'testApi',
			resources: { 'thing:1': { lastRequested: now - 2000 } },
			time: now,
		};
		const reducerMock = jest.fn();
		reducerMock.mockReturnValue(
			{ resources: { 'thing:1': { lastRequested: now - 2000 } } }
		);
		const state2 = reducer( state1, action, [ reducerMock ] );

		expect( reducerMock ).toHaveBeenCalledTimes( 1 );
		expect( reducerMock ).toHaveBeenCalledWith( {}, action );
		expect( state2.testApi.resources[ 'thing:1' ].lastRequested ).toEqual( now - 2000 );
	} );
} );
