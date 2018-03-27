import ApiClient from '../index';
import { SECOND } from '../../utils/constants';

describe( 'ApiClient', () => {
	const api = {
		methods: {},
		endpoints: {
			stuff: {
				fetchByIds: { method: 'get', params: { include: 'ids' } },
			},
		},
		selectors: {
			getStuff: ( apiClientState, requireData ) => ( stuffId, requirements ) => {
				requireData( 'stuff', [ stuffId ], requirements );
				const stuff = apiClientState.stuff[ stuffId ];
				return stuff ? stuff.data : null;
			}
		},
	};

	it( 'should initialize to empty state', () => {
		const apiClient = new ApiClient( api, '123' );
		expect( apiClient.state ).toBe( null );
	} );

	describe( 'setState', () => {
		it( 'should set state initially', () => {
			const apiClient = new ApiClient( api, '123' );
			const state = {
				stuff: { },
			};
			apiClient.setState( state, null );
			expect( apiClient.state ).toBe( state );
		} );

		it( 'should do nothing when the state has not changed', () => {
			const state = {
				stuff: { },
			};
			const apiClient = new ApiClient( api, '123', state );
			apiClient.setState( state, null );
			expect( apiClient.state ).toBe( state );
		} );

		it( 'should set state when state has changed', () => {
			const state1 = {
				stuff: { 1: { data: 'abc' }, 2: { data: 'def' } },
			};
			const state2 = {
				stuff: { ...state1.stuff, 3: { data: 'ghi' } },
			};
			const apiClient = new ApiClient( api, '123', state1 );
			apiClient.setState( state2, null );
			expect( apiClient.state ).toBe( state2 );
		} );
	} );

	describe( 'requireData', () => {
		it( 'should set requirements for an item', () => {
			const reqs = { freshness: 90 * SECOND, timeout: 20 * SECOND };
			const apiClient = new ApiClient( api, '123' );
			apiClient.updateRequirements = () => {}; // Prevent API method calls.
			apiClient.requireData( 'stuff', [ 1 ], reqs );
			expect( apiClient.clientRequirements.stuff[ 1 ] ).toEqual( reqs );
		} );

		it( 'should not call updateReqiurements when no requirements have changed', () => {
			const reqs = { freshness: 90 * SECOND, timeout: 20 * SECOND };
			const apiClient = new ApiClient( api, '123' );

			apiClient.updateRequirements = jest.fn();
			apiClient.requireData( 'stuff', [ 1 ], reqs );
			expect( apiClient.updateRequirements ).toHaveBeenCalled();

			apiClient.updateRequirements = jest.fn();
			apiClient.requireData( 'stuff', [ 1 ], reqs );
			expect( apiClient.updateRequirements ).not.toHaveBeenCalled();
		} );

		it( 'should call updateRequirements when a new requirement is added', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.updateRequirements = jest.fn();
			apiClient.requireData( 'stuff', [ 1 ], { freshness: 90 * SECOND } );
			expect( apiClient.updateRequirements ).toHaveBeenCalled();
		} );

		it( 'should call updateRequirements when a requirement is changed', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.updateRequirements = jest.fn();
			apiClient.requireData( 'stuff', [ 1 ], { freshness: 90 * SECOND } );
			apiClient.requireData( 'stuff', [ 1 ], { freshness: 80 * SECOND } );
			expect( apiClient.updateRequirements ).toHaveBeenCalledTimes( 2 );
		} );
	} );

	it( 'should map selectors to current state', () => {
		const apiClient = new ApiClient( api, '123' );
		const state = {
			stuff: { 1: { data: 'abc' }, 2: { data: 'def' } },
		};
		apiClient.setState( state, null );
		const { getStuff } = apiClient.selectors;
		expect( getStuff( 2, {} ) ).toEqual( 'def' );
	} );

	it( 'should map selectors to new state when it changes', () => {
		const apiClient = new ApiClient( api, '123' );
		const state1 = {
			stuff: { 1: { data: 'abc' }, 2: { data: 'def' } },
		};
		const state2 = {
			stuff: { ...state1.stuff, 3: { data: 'ghi' } },
		};
		apiClient.setState( state1, null );
		expect( apiClient.selectors.getStuff( 2, {} ) ).toEqual( 'def' );

		apiClient.setState( state2, null );
		expect( apiClient.selectors.getStuff( 3, {} ) ).toEqual( 'ghi' );
	} );
} );
