import { get } from 'lodash';
import reducer, {
	reduceError,
	reduceReceived,
	reduceRequested,
} from '../apiclient-reducer';
import {
	FRESH_DATA_CLIENT_ERROR,
	FRESH_DATA_CLIENT_RECEIVED,
	FRESH_DATA_CLIENT_REQUESTED,
} from '../../action-types';

describe( 'reducer', () => {
	const now = new Date();

	describe( '#reducer', () => {
		const testAction = { type: '%%TEST_ACTION%%' };

		it( 'should set default state.', () => {
			const state = reducer( undefined, testAction );
			expect( state ).toMatchObject( { resources: {} } );
		} );

		it( 'should pass an action to a mapped reducer', () => {
			const state1 = { resources: {} };
			const testReducer = jest.fn();
			testReducer.mockReturnValue( { answer: 42 } );
			const reducers = { '%%TEST_ACTION%%': testReducer };
			const state2 = reducer( state1, testAction, reducers );
			expect( testReducer ).toHaveBeenCalledTimes( 1 );
			expect( testReducer ).toHaveBeenCalledWith( state1, testAction );
			expect( state2 ).toEqual( { answer: 42 } );
		} );
	} );

	describe( '#reduceRequested', () => {
		it( 'should set state for a new resource', () => {
			const thing1Action = {
				type: FRESH_DATA_CLIENT_REQUESTED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				time: now,
			};

			const state = reduceRequested( undefined, thing1Action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastRequested: now,
			} );
		} );

		it( 'should overwrite state for an existing resource', () => {
			const state1 = {
				resources: {
					'thing:1': {
						lastRequested: ( now - 1000 ),
					},
				},
			};
			const thing1Action = {
				type: FRESH_DATA_CLIENT_REQUESTED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				time: now,
			};

			const state2 = reduceRequested( state1, thing1Action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastRequested: now,
			} );
		} );
	} );

	describe( '#reduceReceived', () => {
		it( 'should set state for a new resource', () => {
			const thing1Action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				data: {
					foot: 'red',
				},
				time: now,
			};

			const state = reduceReceived( undefined, thing1Action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastReceived: now,
				data: { foot: 'red' },
			} );
		} );

		it( 'should overwrite state for an existing resource', () => {
			const state1 = {
				resources: {
					'thing:1': {
						lastReceived: ( now - 1000 ),
						data: { foot: 'red' },
					},
				},
			};
			const thing1Action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				data: {
					foot: 'blue',
				},
				time: now,
			};

			const state2 = reduceReceived( state1, thing1Action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastReceived: now,
				data: { foot: 'blue' },
			} );
		} );
	} );

	describe( '#reduceError', () => {
		it( 'should set error state for a new resource', () => {
			const thing1Action = {
				type: FRESH_DATA_CLIENT_ERROR,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				error: {
					message: 'Bad, wicked, naughty request!',
				},
				time: now,
			};

			const state = reduceError( undefined, thing1Action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastError: now,
				error: { message: 'Bad, wicked, naughty request!' },
			} );
		} );

		it( 'should overwrite error state for an existing resource', () => {
			const state1 = {
				resources: {
					'thing:1': {
						lastReceived: ( now - 1000 ),
						data: { foot: 'red' },
						lastError: ( now - 2000 ),
						error: { message: 'Do not.' },
					},
				},
			};
			const thing1Action = {
				type: FRESH_DATA_CLIENT_ERROR,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				error: { message: 'Bad, wicked, naughty request!' },
				time: now,
			};

			const state2 = reduceError( state1, thing1Action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastReceived: ( now - 1000 ),
				lastError: now,
				data: { foot: 'red' },
				error: { message: 'Bad, wicked, naughty request!' },
			} );
		} );
	} );
} );
