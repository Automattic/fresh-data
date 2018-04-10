import reduceFreshData, {
	nestReducer,
	reduceError,
	reduceReceived,
	reduceRequested,
} from '../reducer';
import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../action-types';

describe( 'reducer', () => {
	describe( 'nestReducer', () => {
		it( 'should nest state object multiple levels', () => {
			const levels = [ 'levelOne', 'levelTwo', 'levelThree' ];
			const valueAction = { value: '123' };
			const reducer = ( state, action ) => {
				return { value: action.value };
			};

			const state = nestReducer( levels, reducer, undefined, valueAction );
			expect( state.levelOne.levelTwo.levelThree.value ).toEqual( '123' );
		} );
	} );

	describe( 'reduceFreshData', () => {
		it( 'should initialize to an empty object', () => {
			const state = reduceFreshData( undefined, { type: '%%%TEST_ACTION%%%' } );
			expect( state ).toEqual( {} );
		} );

		it( 'should call a corresponding nested reducer', () => {
			const mockEndpointState = { 3: { test: 'test3' } };
			const endpointReducer = jest.fn();
			endpointReducer.mockReturnValue( mockEndpointState );
			const reducers = {
				'%%%TEST_ACTION%%%': endpointReducer,
			};
			const action = {
				type: '%%%TEST_ACTION%%%',
				apiName: 'stuff-api',
				clientKey: 'mystuff',
				endpoint: 'importantStuff',
				ids: [ 3 ],
			};

			const state1 = { 'another-api': {} };
			const state2 = reduceFreshData( state1, action, reducers );
			expect( endpointReducer ).toBeCalledWith( undefined, action );
			expect( state2[ 'stuff-api' ].mystuff.importantStuff ).toBe( mockEndpointState );
		} );
	} );

	describe( 'reduceError', () => {
		const error = { message: 'something bad', time: new Date() };
		const action = {
			type: FRESH_DATA_CLIENT_ERROR,
			apiName: 'stuff-api',
			clientKey: 'mystuff',
			endpoint: 'importantStuff',
			ids: [ 1, 2, 4 ],
			error,
		};

		it( 'should set lastReceived', () => {
			const endpointState = reduceError( undefined, action );
			expect( Object.keys( endpointState ) ).toHaveLength( 3 );
			expect( endpointState[ 1 ].error ).toEqual( action.error );
			expect( endpointState[ 2 ].error ).toEqual( error );
			expect( endpointState[ 4 ].error ).toEqual( error );
		} );

		it( 'should not clobber other state', () => {
			const state1 = {
				1: { otherData: 'other1' },
				3: { otherData: 'other3' },
			};
			const state2 = reduceError( state1, action );
			expect( state2[ 1 ].otherData ).toEqual( 'other1' );
			expect( state2[ 3 ].otherData ).toEqual( 'other3' );
		} );
	} );

	describe( 'reduceReceived', () => {
		const now = new Date();
		const action = {
			type: FRESH_DATA_CLIENT_RECEIVED,
			apiName: 'stuff-api',
			clientKey: 'mystuff',
			endpoint: 'importantStuff',
			data: {
				1: { value: '1' },
				2: { value: '2' },
				4: { value: '4' },
			},
			time: now,
		};

		it( 'should set lastReceived', () => {
			const endpointState = reduceReceived( undefined, action );
			expect( Object.keys( endpointState ) ).toHaveLength( 3 );
			expect( endpointState[ 1 ].lastReceived ).toEqual( now );
			expect( endpointState[ 2 ].lastReceived ).toEqual( now );
			expect( endpointState[ 4 ].lastReceived ).toEqual( now );
		} );

		it( 'should set time if no time given', () => {
			const { time: originalTime, ...actionNoTime } = action;
			const endpointState = reduceReceived( undefined, actionNoTime );
			expect( endpointState[ 1 ].lastReceived.getTime() ).toBeGreaterThan(
				originalTime.getTime()
			);
		} );

		it( 'should set data', () => {
			const endpointState = reduceReceived( undefined, action );
			expect( Object.keys( endpointState ) ).toHaveLength( 3 );
			expect( endpointState[ 1 ].data ).toEqual( action.data[ 1 ] );
			expect( endpointState[ 2 ].data ).toEqual( action.data[ 2 ] );
			expect( endpointState[ 4 ].data ).toEqual( action.data[ 4 ] );
		} );

		it( 'should not clobber other state', () => {
			const state1 = {
				1: { otherData: 'other1' },
				3: { otherData: 'other3' },
			};
			const state2 = reduceReceived( state1, action );
			expect( state2[ 1 ].otherData ).toEqual( 'other1' );
			expect( state2[ 3 ].otherData ).toEqual( 'other3' );
		} );
	} );

	describe( 'reduceRequested', () => {
		const now = new Date();
		const action = {
			type: FRESH_DATA_CLIENT_REQUESTED,
			apiName: 'stuff-api',
			clientKey: 'mystuff',
			endpoint: 'importantStuff',
			ids: [ 1, 2, 4, 8 ],
			time: now,
		};

		it( 'should set lastRequested', () => {
			const endpointState = reduceRequested( undefined, action );
			expect( Object.keys( endpointState ) ).toHaveLength( 4 );
			expect( endpointState[ 1 ].lastRequested ).toEqual( now );
			expect( endpointState[ 2 ].lastRequested ).toEqual( now );
			expect( endpointState[ 4 ].lastRequested ).toEqual( now );
			expect( endpointState[ 8 ].lastRequested ).toEqual( now );
		} );

		it( 'should set time if no time given', () => {
			const { time: originalTime, ...actionNoTime } = action;
			const endpointState = reduceRequested( undefined, actionNoTime );
			expect( endpointState[ 1 ].lastRequested.getTime() ).toBeGreaterThan(
				originalTime.getTime()
			);
		} );

		it( 'should not clobber other state', () => {
			const state1 = {
				1: { otherData: 'other1' },
				3: { otherData: 'other3' },
			};
			const state2 = reduceRequested( state1, action );
			expect( state2[ 1 ].otherData ).toEqual( 'other1' );
			expect( state2[ 3 ].otherData ).toEqual( 'other3' );
		} );
	} );
} );
