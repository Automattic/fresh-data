import { get } from 'lodash';
import reducer, {
	reduceReceived,
	reduceRequested,
} from '../apiclient-reducer';
import {
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
		it( 'should set state for new resources', () => {
			const action = {
				type: FRESH_DATA_CLIENT_REQUESTED,
				apiName: 'test-api',
				clientKey: '123',
				resourceNames: [ 'thing:1', 'thing:2' ],
				time: now,
			};

			const state = reduceRequested( undefined, action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastRequested: now,
			} );
			const thing2State = get( state, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( {
				lastRequested: now,
			} );
		} );

		it( 'should overwrite state for existing resources', () => {
			const state1 = {
				resources: {
					'thing:1': {
						lastRequested: ( now - 1000 ),
					},
					'thing:2': {
						lastRequested: ( now - 1000 ),
					},
				},
			};
			const action = {
				type: FRESH_DATA_CLIENT_REQUESTED,
				apiName: 'test-api',
				clientKey: '123',
				resourceNames: [ 'thing:1', 'thing:2' ],
				time: now,
			};

			const state2 = reduceRequested( state1, action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastRequested: now,
			} );
			const thing2State = get( state2, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( {
				lastRequested: now,
			} );
		} );
	} );

	describe( '#reduceReceived', () => {
		it( 'should set state for new resources', () => {
			const action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				resources: {
					'thing:1': {
						data: {
							foot: 'red',
						}
					},
					'thing:2': {
						data: {
							foot: 'blue',
						}
					}
				},
				time: now,
			};

			const state = reduceReceived( undefined, action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastReceived: now,
				data: { foot: 'red' },
			} );
			const thing2State = get( state, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( {
				lastReceived: now,
				data: { foot: 'blue' },
			} );
		} );

		it( 'should overwrite state for existing resources', () => {
			const state1 = {
				resources: {
					'thing:1': {
						lastReceived: ( now - 1000 ),
						data: { foot: 'red' },
					},
				},
			};
			const action = {
				type: FRESH_DATA_CLIENT_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				resources: {
					'thing:1': {
						data: {
							foot: 'blue',
						}
					},
					'thing:2': {
						data: {
							foot: 'green',
						}
					}
				},
				time: now,
			};

			const state2 = reduceReceived( state1, action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastReceived: now,
				data: { foot: 'blue' },
			} );
			const thing2State = get( state2, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( {
				lastReceived: now,
				data: { foot: 'green' },
			} );
		} );
	} );
} );
