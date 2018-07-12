import { get } from 'lodash';
import reducer from '../apiclient-reducer';
import { FRESH_DATA_RECEIVED, FRESH_DATA_REQUESTED } from '../../action-types';

describe( 'reducer', () => {
	const now = new Date();

	describe( '#reducer', () => {
		const testAction = { type: '%%TEST_ACTION%%' };

		it( 'should set default state.', () => {
			const state = reducer( undefined, testAction );
			expect( state ).toMatchObject( { resources: {} } );
		} );

		it( 'should set state for requesting new resources', () => {
			const action = {
				type: FRESH_DATA_REQUESTED,
				apiName: 'test-api',
				clientKey: '123',
				resourceNames: [ 'thing:1', 'thing:2' ],
				time: now,
			};

			const state = reducer( undefined, action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( { lastRequested: now } );
			const thing2State = get( state, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( { lastRequested: now } );
		} );

		it( 'should overwrite state for requesting existing resources', () => {
			const state1 = {
				resources: {
					'thing:1': {
						lastRequested: ( now - 1000 ),
						lastReceived: ( now - 990 ),
						data: { foot: 'red' },
					},
				},
			};
			const action = {
				type: FRESH_DATA_REQUESTED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				resourceNames: [ 'thing:1', 'thing:2' ],
				time: now,
			};

			const state2 = reducer( state1, action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( {
				lastRequested: now,
				lastReceived: ( now - 990 ),
				data: { foot: 'red' },
			} );
			const thing2State = get( state2, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( { lastRequested: now } );
		} );

		it( 'should set state for receiving new resources', () => {
			const action = {
				type: FRESH_DATA_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				resources: {
					'thing:1': { data: { foot: 'red' } },
					'thing:2': { data: { foot: 'blue' } }
				},
				time: now,
			};

			const state = reducer( undefined, action );
			const thing1State = get( state, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( { lastReceived: now, data: { foot: 'red' } } );
			const thing2State = get( state, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( { lastReceived: now, data: { foot: 'blue' } } );
		} );

		it( 'should overwrite state for receiving existing resources', () => {
			const state1 = {
				resources: {
					'thing:1': { lastReceived: ( now - 1000 ), data: { foot: 'red' } },
				},
			};
			const action = {
				type: FRESH_DATA_RECEIVED,
				apiName: 'test-api',
				clientKey: '123',
				resourceName: 'thing:1',
				resources: {
					'thing:1': { data: { foot: 'blue' } },
					'thing:2': { data: { foot: 'green' } },
					'thing:3': { error: { message: 'oops!' } },
				},
				time: now,
			};

			const state2 = reducer( state1, action );
			const thing1State = get( state2, [ 'resources', 'thing:1' ] );
			expect( thing1State ).toEqual( { lastReceived: now, data: { foot: 'blue' } } );
			const thing2State = get( state2, [ 'resources', 'thing:2' ] );
			expect( thing2State ).toEqual( { lastReceived: now, data: { foot: 'green' } } );
			const thing3State = get( state2, [ 'resources', 'thing:3' ] );
			expect( thing3State ).toEqual( { lastError: now, error: { message: 'oops!' } } );
		} );
	} );
} );
