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
		expect( getTimeoutLeft( undefined, {}, now ) ).toEqual( Number.MAX_SAFE_INTEGER );
	} );

	it( 'should return max integer if never requested', () => {
		expect( getTimeoutLeft( 10 * SECOND, {}, now ) ).toEqual( Number.MAX_SAFE_INTEGER );
	} );

	it( 'should return how long ago time has expired.', () => {
		const state = { lastRequested: now - ( 11 * SECOND ) };
		expect( getTimeoutLeft( 10 * SECOND, state, now ) ).toEqual( -( 1 * SECOND ) );
	} );

	it( 'should return how long until expiration is reached.', () => {
		const state = { lastRequested: now - ( 4 * SECOND ) };
		expect( getTimeoutLeft( 10 * SECOND, state, now ) ).toEqual( 6 * SECOND );
	} );
} );

describe( 'getFreshnessLeft', () => {
	const now = new Date();
	it( 'should return max integer for empty input.', () => {
		expect( getFreshnessLeft( undefined, {}, now ) ).toEqual( Number.MAX_SAFE_INTEGER );
	} );

	it( 'should return min integer if never received.', () => {
		expect( getFreshnessLeft( 90 * SECOND, {}, now ) ).toEqual( Number.MIN_SAFE_INTEGER );
	} );

	it( 'should return how long ago freshness has expired.', () => {
		const state = { lastReceived: now - ( 93 * SECOND ) };
		expect( getFreshnessLeft( 90 * SECOND, state, now ) ).toEqual( -( 3 * SECOND ) );
	} );

	it( 'should return how long until freshness expires.', () => {
		const state = { lastReceived: now - ( 20 * SECOND ) };
		expect( getFreshnessLeft( 90 * SECOND, state, now ) ).toEqual( 70 * SECOND );
	} );
} );

describe( 'calculateUpdates', () => {
	const now = new Date();

	it( 'should return empty if there are no requirements.', () => {
		const { updates } = calculateUpdates( {}, {} );
		expect( updates ).toEqual( [] );
	} );

	it( 'should return a single update for a stale resource', () => {
		const requirements = {
			'thing:1': { freshness: 60 * SECOND },
		};
		const state = {
			'thing:1': { lastReceived: now - ( 62 * SECOND ) },
		};

		const { updates } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [ 'thing:1' ] );
	} );

	it( 'should return a single update for a stale resource query', () => {
		const requirements = {
			'thing-page:{page:1,perPage:3}': { freshness: 120 * SECOND },
		};
		const state = {
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 121 * SECOND ) },
		};

		const { updates } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [ 'thing-page:{page:1,perPage:3}' ] );
	} );

	it( 'should not return an update if stale but requested and not yet timed out.', () => {
		const requirements = {
			'thing-page:{page:1,perPage:3}': { freshness: 120 * SECOND, timeout: 10 * SECOND },
		};
		const state = {
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 121 * SECOND ), lastRequested: now - ( 5 * SECOND ) },
		};

		const { updates } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [] );
	} );

	it( 'should return an update if both stale, requested and timed out.', () => {
		const requirements = {
			'thing-page:{page:1,perPage:3}': { freshness: 120 * SECOND, timeout: 3 * SECOND },
		};
		const state = {
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 121 * SECOND ), lastRequested: now - ( 5 * SECOND ) },
		};

		const { updates } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [ 'thing-page:{page:1,perPage:3}' ] );
	} );

	it( 'should not return an update if timed out, but no longer stale.', () => {
		const requirements = {
			'thing-page:{page:1,perPage:3}': { freshness: 120 * SECOND, timeout: 3 * SECOND },
		};
		const state = {
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 3 * SECOND ), lastRequested: now - ( 5 * SECOND ) },
		};

		const { updates } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [] );
	} );

	it( 'should return an empty set if nothing needs an update', () => {
		const requirements = {
			'thing:1': { freshness: 60 * SECOND },
			'thing-page:{page:1,perPage:3}': { freshness: 120 * SECOND, timeout: 3 * SECOND },
		};
		const state = {
			'thing:1': { lastReceived: now - ( 59 * SECOND ) },
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 50 * SECOND ) },
		};

		const { updates } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [] );
	} );

	it( 'should add updates for requirements that are not yet present in state', () => {
		const requirements = {
			'thing:1': { freshness: 60 * SECOND },
			'thing-page:{page:1,perPage:3}': { freshness: 120 * SECOND },
		};

		const { updates } = calculateUpdates( requirements, {}, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( updates ).toEqual( [ 'thing:1', 'thing-page:{page:1,perPage:3}' ] );
	} );

	it( 'should give a default nextUpdate value in the absence of any needed updates', () => {
		expect( calculateUpdates( {}, {} ).nextUpdate ).toEqual( DEFAULT_MAX_UPDATE );
	} );

	it( 'should return default value if nothing is required earlier.', () => {
		const requirements = {
			'thing:1': { freshness: DEFAULT_MIN_UPDATE + SECOND },
			'thing-page:{page:1,perPage:3}': { freshness: DEFAULT_MIN_UPDATE + SECOND },
		};
		const state = {
			'thing:1': { lastReceived: now - ( 1 * SECOND ) },
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 1 * SECOND ) },
		};
		const { nextUpdate } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( nextUpdate ).toEqual( DEFAULT_MIN_UPDATE );
	} );

	it( 'should return time difference for earliest required resource.', () => {
		const requirements = {
			'thing:1': { freshness: 60 * SECOND },
			'thing-page:{page:1,perPage:3}': { freshness: 90 * SECOND },
		};
		const state = {
			'thing:1': { lastReceived: now - ( 40 * SECOND ) },
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 40 * SECOND ) },
		};
		const { nextUpdate } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( nextUpdate ).toEqual( ( 20 * SECOND ) );
	} );

	it( 'should never return a smaller value than minimum.', () => {
		const requirements = {
			'thing:1': { freshness: 60 * SECOND },
			'thing-page:{page:1,perPage:3}': { freshness: 90 * SECOND },
		};
		const state = {
			'thing:1': { lastReceived: now - ( 62 * SECOND ) },
			'thing-page:{page:1,perPage:3}': { lastReceived: now - ( 40 * SECOND ) },
		};
		const { nextUpdate } = calculateUpdates( requirements, state, DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE, now );
		expect( nextUpdate ).toEqual( DEFAULT_MIN_UPDATE );
	} );
} );
