import { SECOND } from '../../utils/constants';
import calculateUpdates, {
	DEFAULT_MIN_UPDATE,
	DEFAULT_MAX_UPDATE,
	getFreshnessLeft,
	getTimeoutLeft,
} from '../calculate-updates';

describe( 'getTimeoutLeft', () => {
	const now = new Date();
	it( 'should return max integer for empty input.', () => {
		expect( getTimeoutLeft( {}, {}, now ) ).toEqual( Number.MAX_SAFE_INTEGER );
	} );

	it( 'should return max integer if never requested', () => {
		const requirement = { timeout: 10 * SECOND };
		expect( getTimeoutLeft( requirement, {}, now ) ).toEqual( Number.MAX_SAFE_INTEGER );
	} );

	it( 'should return how long ago time has expired.', () => {
		const requirement = { timeout: 10 * SECOND };
		const state = { lastRequested: now - ( 11 * SECOND ) };
		expect( getTimeoutLeft( requirement, state, now ) ).toEqual( -( 1 * SECOND ) );
	} );

	it( 'should return how long until expiration is reached.', () => {
		const requirement = { timeout: 10 * SECOND };
		const state = { lastRequested: now - ( 4 * SECOND ) };
		expect( getTimeoutLeft( requirement, state, now ) ).toEqual( 6 * SECOND );
	} );
} );

describe( 'getFreshnessLeft', () => {
	const now = new Date();
	it( 'should return max integer for empty input.', () => {
		expect( getFreshnessLeft( {}, {}, now ) ).toEqual( Number.MAX_SAFE_INTEGER );
	} );

	it( 'should return min integer if never received.', () => {
		const requirement = { freshness: 90 * SECOND };
		expect( getFreshnessLeft( requirement, {}, now ) ).toEqual( Number.MIN_SAFE_INTEGER );
	} );

	it( 'should return how long ago freshness has expired.', () => {
		const requirement = { freshness: 90 * SECOND };
		const state = { lastReceived: now - ( 93 * SECOND ) };
		expect( getFreshnessLeft( requirement, state, now ) ).toEqual( -( 3 * SECOND ) );
	} );

	it( 'should return how long until freshness expires.', () => {
		const requirement = { freshness: 90 * SECOND };
		const state = { lastReceived: now - ( 20 * SECOND ) };
		expect( getFreshnessLeft( requirement, state, now ) ).toEqual( 70 * SECOND );
	} );
} );

describe( 'calculateUpdates', () => {
	const now = new Date();

	it( 'should return empty if there are no requirements.', () => {
		const { updates } = calculateUpdates( {}, {} );
		expect( updates ).toEqual( [] );
	} );

	it( 'should return a single endpoint update for a stale endpoint', () => {
		const requirementsByEndpoint = {
			things: {
				endpoints: {
					1: { freshness: 60 * SECOND },
				},
			},
		};
		const endpointsState = {
			things: {
				endpoints: {
					1: { lastReceived: now - ( 62 * SECOND ) },
				},
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [
			{ endpointPath: [ 'things', '1' ] },
		] );
	} );

	it( 'should return a single endpoint update for a stale endpoint query', () => {
		const requirementsByEndpoint = {
			things: {
				queries: [
					{ params: { page: 1, perPage: 3 }, freshness: 120 * SECOND },
				],
			},
		};
		const endpointsState = {
			things: {
				queries: [
					{ params: { page: 1, perPage: 3 }, lastReceived: now - ( 121 * SECOND ) },
				],
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [
			{ endpointPath: [ 'things' ], params: { page: 1, perPage: 3 } },
		] );
	} );

	it( 'should not return an update if stale but requested and not yet timed out.', () => {
		const requirementsByEndpoint = {
			things: {
				queries: [
					{
						params: { page: 1, perPage: 3 },
						freshness: 120 * SECOND,
						timeout: 10 * SECOND,
					},
				],
			},
		};
		const endpointsState = {
			things: {
				queries: [
					{
						params: { page: 1, perPage: 3 },
						lastReceived: now - ( 121 * SECOND ),
						lastRequested: now - ( 5 * SECOND ),
					},
				],
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [] );
	} );

	it( 'should return an update if both stale, requested and timed out.', () => {
		const requirementsByEndpoint = {
			things: {
				queries: [
					{
						params: { page: 1, perPage: 3 },
						freshness: 120 * SECOND,
						timeout: 3 * SECOND,
					},
				],
			},
		};
		const endpointsState = {
			things: {
				queries: [
					{
						params: { page: 1, perPage: 3 },
						lastReceived: now - ( 121 * SECOND ),
						lastRequested: now - ( 5 * SECOND ),
					},
				],
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [
			{ endpointPath: [ 'things' ], params: { page: 1, perPage: 3 } },
		] );
	} );

	it( 'should not return an update if timed out, but no longer stale.', () => {
		const requirementsByEndpoint = {
			things: {
				queries: [
					{
						params: { page: 1, perPage: 3 },
						freshness: 120 * SECOND,
						timeout: 3 * SECOND,
					},
				],
			},
		};
		const endpointsState = {
			things: {
				queries: [
					{
						params: { page: 1, perPage: 3 },
						lastReceived: now - ( 3 * SECOND ),
						lastRequested: now - ( 5 * SECOND ),
					},
				],
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [] );
	} );

	it( 'should return an empty set if nothing needs an update', () => {
		const requirementsByEndpoint = {
			things: {
				endpoints: {
					1: { freshness: 60 * SECOND },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, freshness: 120 * SECOND },
				],
			},
		};
		const endpointsState = {
			things: {
				endpoints: {
					1: { lastReceived: now - ( 59 * SECOND ) },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, lastReceived: now - ( 50 * SECOND ) },
				],
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [] );
	} );

	it( 'should add updates for requirements that are not yet present in state', () => {
		const requirementsByEndpoint = {
			things: {
				endpoints: {
					1: { freshness: 60 * SECOND },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, freshness: 120 * SECOND },
				],
			},
		};

		const { updates } = calculateUpdates( requirementsByEndpoint, {}, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [
			{ endpointPath: [ 'things', '1' ] },
			{ endpointPath: [ 'things' ], params: { page: 1, perPage: 3 } },
		] );
	} );

	it( 'should give a default nextUpdate value in the absence of any needed updates', () => {
		expect( calculateUpdates( {}, {} ).nextUpdate ).toEqual( DEFAULT_MAX_UPDATE );
	} );

	it( 'should return default value if nothing is required earlier.', () => {
		const requirementsByEndpoint = {
			things: {
				endpoints: {
					1: { freshness: DEFAULT_MIN_UPDATE + SECOND },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, freshness: DEFAULT_MIN_UPDATE + SECOND },
				],
			},
		};
		const endpointsState = {
			things: {
				endpoints: {
					1: { lastReceived: now - ( 1 * SECOND ) },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, lastReceived: now - ( 1 * SECOND ) },
				],
			},
		};
		const { nextUpdate } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( nextUpdate ).toEqual( DEFAULT_MIN_UPDATE );
	} );

	it( 'should return time difference for earliest required endpoint.', () => {
		const requirementsByEndpoint = {
			things: {
				endpoints: {
					1: { freshness: 60 * SECOND },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, freshness: 90 * SECOND },
				],
			},
		};
		const endpointsState = {
			things: {
				endpoints: {
					1: { lastReceived: now - ( 40 * SECOND ) },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, lastReceived: now - ( 40 * SECOND ) },
				],
			},
		};
		const { nextUpdate } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( nextUpdate ).toEqual( ( 20 * SECOND ) );
	} );

	it( 'should never return a smaller value than minimum.', () => {
		const requirementsByEndpoint = {
			things: {
				endpoints: {
					1: { freshness: 60 * SECOND },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, freshness: 90 * SECOND },
				],
			},
		};
		const endpointsState = {
			things: {
				endpoints: {
					1: { lastReceived: now - ( 62 * SECOND ) },
				},
				queries: [
					{ params: { page: 1, perPage: 3 }, lastReceived: now - ( 40 * SECOND ) },
				],
			},
		};
		const { nextUpdate } = calculateUpdates( requirementsByEndpoint, endpointsState, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( nextUpdate ).toEqual( DEFAULT_MIN_UPDATE );
	} );
} );

