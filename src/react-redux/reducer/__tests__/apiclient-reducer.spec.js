import { get } from 'lodash';
import reducer, { reduceReceived } from '../apiclient-reducer';
import { FRESH_DATA_CLIENT_RECEIVED } from '../../action-types';

describe( 'reducer', () => {
	const now = new Date();

	describe( '#reducer', () => {
		const testAction = { type: '%%TEST_ACTION%%' };

		it( 'should set default state.', () => {
			const state = reducer( undefined, testAction );
			expect( state ).toMatchObject( { endpoints: {} } );
		} );

		it( 'should pass an action to a mapped reducer', () => {
			const state1 = { endpoints: {} };
			const testReducer = jest.fn();
			testReducer.mockReturnValue( { answer: 42 } );
			const reducers = { '%%TEST_ACTION%%': testReducer };
			const state2 = reducer( state1, testAction, reducers );
			expect( testReducer ).toHaveBeenCalledTimes( 1 );
			expect( testReducer ).toHaveBeenCalledWith( state1, testAction );
			expect( state2 ).toEqual( { answer: 42 } );
		} );
	} );

	describe( '#reduceReceived', () => {
		it( 'should set state for a new endpoint', () => {
			const thing1Action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				endpointPath: [ 'things', 1 ],
				data: {
					foot: 'red',
				},
				time: now,
			};

			const state = reduceReceived( undefined, thing1Action );
			const thing1State = get( state, [ 'endpoints', 'things', 'endpoints', 1 ] );
			expect( thing1State ).toEqual( {
				lastReceived: now,
				data: { foot: 'red' },
			} );
		} );

		it( 'should overwrite state for an existing endpoint', () => {
			const state1 = {
				endpoints: {
					things: {
						endpoints: {
							1: {
								lastReceived: ( now - 1000 ),
								data: { foot: 'red' },
							},
						},
					},
				},
			};
			const thing1Action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				endpointPath: [ 'things', 1 ],
				data: {
					foot: 'blue',
				},
				time: now,
			};

			const state2 = reduceReceived( state1, thing1Action );
			const thing1State = get( state2, [ 'endpoints', 'things', 'endpoints', 1 ] );
			expect( thing1State ).toEqual( {
				lastReceived: now,
				data: { foot: 'blue' },
			} );
		} );

		it( 'should set state for a new query', () => {
			const thingsPage1Action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				endpointPath: [ 'things' ],
				params: { page: 1, perPage: 3 },
				data: [
					{ id: 1, foot: 'red' },
					{ id: 2, foot: 'blue' },
					{ id: 3, feet: 'many' },
				],
				time: now,
			};

			const state = reduceReceived( undefined, thingsPage1Action );
			const queriesState = get( state, [ 'endpoints', 'things', 'queries' ] );
			expect( queriesState ).toEqual( [ {
				params: { page: 1, perPage: 3 },
				lastReceived: now,
				data: [
					{ id: 1, foot: 'red' },
					{ id: 2, foot: 'blue' },
					{ id: 3, feet: 'many' },
				],
			} ] );
		} );

		it( 'should overwrite state for an existing query', () => {
			const state1 = {
				endpoints: {
					things: {
						queries: [
							{
								params: { page: 1, perPage: 3 },
								lastReceived: ( now - 20000 ),
								data: [
									{ id: 1, foot: 'red' },
									{ id: 2, foot: 'blue' },
								],
							},
						],
					}
				},
			};
			const thingsPage1Action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				endpointPath: [ 'things' ],
				params: { page: 1, perPage: 3 },
				data: [
					{ id: 1, foot: 'blue' },
					{ id: 2, foot: 'red' },
					{ id: 3, feet: 'many' },
				],
				time: now,
			};

			const state2 = reduceReceived( state1, thingsPage1Action );
			const queriesState = get( state2, [ 'endpoints', 'things', 'queries' ] );
			expect( queriesState ).toEqual( [ {
				params: { page: 1, perPage: 3 },
				lastReceived: now,
				data: [
					{ id: 1, foot: 'blue' },
					{ id: 2, foot: 'red' },
					{ id: 3, feet: 'many' },
				],
			} ] );
		} );
	} );
} );
