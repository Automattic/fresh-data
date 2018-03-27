import { SECOND } from '../../utils/constants';
import {
	DEFAULT_NEXT_UPDATE,
	DEFAULTS,
	calculateClientUpdates,
	calculateEndpointUpdates,
	calculateNextItemUpdate,
	reduceEndpointRequirements,
	reduceItemRequirements,
} from '../requirements';

describe( 'reduceItemRequirements', () => {
	it( 'should not update when nothing has changed', () => {
		const reqs = reduceItemRequirements( DEFAULTS, { ...DEFAULTS } );
		expect( reqs ).toBe( DEFAULTS );
	} );

	it( 'should imply defaults when no old requirements exist', () => {
		const reqs = reduceItemRequirements( undefined, { freshness: 90 * SECOND } );
		expect( reqs.timeout ).toEqual( DEFAULTS.timeout );
	} );

	it( 'should update freshness to a smaller value', () => {
		const freshness = DEFAULTS.freshness - 1000;
		const reqs1 = { ...DEFAULTS, freshness };
		const reqs2 = reduceItemRequirements( DEFAULTS, reqs1 );
		expect( reqs2 ).not.toBe( DEFAULTS );
		expect( reqs2.freshness ).toEqual( freshness );
	} );

	it( 'should not update freshness to a larger value', () => {
		const freshness = DEFAULTS.freshness - 10000;
		const oldReqs = { ...DEFAULTS, freshness };
		const reqs1 = { ...DEFAULTS, freshness: freshness + 1000 };
		const reqs2 = reduceItemRequirements( oldReqs, reqs1 );
		expect( reqs2 ).toBe( oldReqs );
	} );

	it( 'should update timeout to a smaller value', () => {
		const timeout = DEFAULTS.timeout - 1000;
		const reqs1 = { ...DEFAULTS, timeout };
		const reqs2 = reduceItemRequirements( DEFAULTS, reqs1 );
		expect( reqs2 ).not.toBe( DEFAULTS );
		expect( reqs2.timeout ).toEqual( timeout );
	} );

	it( 'should not update timeout to a larger value', () => {
		const timeout = DEFAULTS.timeout + 10000;
		const reqs1 = { ...DEFAULTS, timeout };
		const reqs2 = reduceItemRequirements( DEFAULTS, reqs1 );
		expect( reqs2 ).toBe( DEFAULTS );
	} );
} );

describe( 'reduceEndpointRequirements', () => {
	it( 'should not update when nothing has changed.', () => {
		const endpointReqs0 = {
			1: { freshness: 30 * SECOND },
			2: { freshness: 60 * SECOND },
		};
		const requirements = { freshness: 60 * SECOND };
		const endpointReqs1 = reduceEndpointRequirements( endpointReqs0, [ 2 ], requirements );
		expect( endpointReqs1 ).toBe( endpointReqs0 );
	} );

	it( 'should update an item when freshness is shorter', () => {
		const endpointReqs0 = {
			1: { freshness: 30 * SECOND },
			2: { freshness: 60 * SECOND },
		};
		const requirements = { freshness: 45 * SECOND };
		const endpointReqs1 = reduceEndpointRequirements( endpointReqs0, [ 2 ], requirements );
		expect( endpointReqs1 ).not.toBe( endpointReqs0 );
		expect( endpointReqs1[ 2 ].freshness ).toEqual( 45 * SECOND );
	} );

	it( 'should not update an item when freshness is longer', () => {
		const endpointReqs0 = {
			1: { freshness: 30 * SECOND },
			2: { freshness: 60 * SECOND },
		};
		const requirements = { freshness: 70 * SECOND };
		const endpointReqs1 = reduceEndpointRequirements( endpointReqs0, [ 2 ], requirements );
		expect( endpointReqs1 ).toBe( endpointReqs0 );
	} );

	it( 'should update multiple items with the same freshness', () => {
		const endpointReqs0 = {
			1: { freshness: 50 * SECOND },
			2: { freshness: 60 * SECOND },
		};
		const requirements = { freshness: 45 * SECOND };
		const endpointReqs1 = reduceEndpointRequirements( endpointReqs0, [ 1, 2 ], requirements );
		expect( endpointReqs1 ).not.toBe( endpointReqs0 );
		expect( endpointReqs1[ 1 ].freshness ).toEqual( 45 * SECOND );
		expect( endpointReqs1[ 2 ].freshness ).toEqual( 45 * SECOND );
	} );
} );

describe( 'calculateNextItemUpdate', () => {
	const requirements = {
		freshness: 90 * SECOND,
		timeout: 30 * SECOND,
	};

	it( 'should be negative value with no itemState', () => {
		const now = new Date();

		const nextUpdate = calculateNextItemUpdate( requirements, undefined, now );
		expect( nextUpdate ).toEqual( -( now - Number.MIN_SAFE_INTEGER - requirements.freshness ) );
	} );

	it( 'should be negative value when timeout is reached', () => {
		const now = new Date();
		const itemState = {
			lastReceived: new Date( now - ( 80 * SECOND ) ),
			lastRequested: new Date( now - ( 35 * SECOND ) ),
		};

		const nextUpdate = calculateNextItemUpdate( requirements, itemState, now );
		expect( nextUpdate ).toEqual( -( 5 * SECOND ) );
	} );

	it( 'should be negative value when stale', () => {
		const now = new Date();
		const itemState = {
			lastReceived: new Date( now - ( 120 * SECOND ) ),
			lastRequested: null,
		};

		const nextUpdate = calculateNextItemUpdate( requirements, itemState, now );
		expect( nextUpdate ).toEqual( -( 30 * SECOND ) );
	} );

	it( 'should be positive value when fresh', () => {
		const now = new Date();
		const itemState = {
			lastReceived: new Date( now - ( 40 * SECOND ) ),
			lastRequested: null,
		};

		const nextUpdate = calculateNextItemUpdate( requirements, itemState, now );
		expect( nextUpdate ).toEqual( 50 * SECOND );
	} );

	it( 'should be positive value when fetching', () => {
		const now = new Date();
		const itemState = {
			lastReceived: new Date( now - ( 40 * SECOND ) ),
			lastRequested: new Date( now - ( 25 * SECOND ) ),
		};

		const nextUpdate = calculateNextItemUpdate( requirements, itemState, now );
		expect( nextUpdate ).toEqual( 5 * SECOND );
	} );

	it( 'should give max integer when there is no freshness set', () => {
		const now = new Date();
		const itemState = {
			lastReceived: new Date( now - ( 40 * SECOND ) ),
			lastRequested: null,
		};

		const nextUpdate = calculateNextItemUpdate( { timeout: 30 * SECOND }, itemState, now );
		expect( nextUpdate ).toEqual( Number.MAX_SAFE_INTEGER );
	} );
} );

describe( 'calculateEndpointUpdates', () => {
	const endpointRequirements = {
		1: { freshness: 90 * SECOND, timeout: 30 * SECOND },
		2: { freshness: 45 * SECOND, timeout: 30 * SECOND },
		3: { freshness: 300 * SECOND, timeout: 30 * SECOND },
	};

	it( 'should give default update info when there are no requirements', () => {
		const now = new Date();
		const endpointState = {};

		const updateInfo = calculateEndpointUpdates( {}, endpointState, now );
		expect( updateInfo ).toEqual( { updates: [], nextUpdate: DEFAULT_NEXT_UPDATE } );
	} );

	it( 'should give nearest freshness update between several items', () => {
		const now = new Date();
		const endpointState = {
			1: { lastReceived: new Date( now - ( 5 * SECOND ) ) },
			2: { lastReceived: new Date( now - ( 5 * SECOND ) ) },
			3: { lastReceived: new Date( now - ( 5 * SECOND ) ) },
		};

		const updateInfo = calculateEndpointUpdates( endpointRequirements, endpointState, now );
		expect( updateInfo.nextUpdate ).toEqual( 40 * SECOND );
	} );

	it( 'should include all items that are stale', () => {
		const now = new Date();
		const endpointState = {
			1: { lastReceived: new Date( now - ( 95 * SECOND ) ) },
			2: { lastReceived: new Date( now - ( 95 * SECOND ) ) },
			3: { lastReceived: new Date( now - ( 95 * SECOND ) ) },
		};

		const updateInfo = calculateEndpointUpdates( endpointRequirements, endpointState, now );
		expect( updateInfo.nextUpdate ).toEqual( -( 50 * SECOND ) );
		expect( updateInfo.updates ).toEqual( [ '1', '2' ] );
	} );

	it( 'should include an item that has timed out', () => {
		const now = new Date();
		const endpointState = {
			1: {
				lastReceived: new Date( now - ( 60 * SECOND ) ),
				lastRequested: new Date( now - ( 32 * SECOND ) ),
			},
			2: { lastReceived: new Date( now - ( 5 * SECOND ) ) },
			3: { lastReceived: new Date( now - ( 5 * SECOND ) ) },
		};

		const updateInfo = calculateEndpointUpdates( endpointRequirements, endpointState, now );
		expect( updateInfo.nextUpdate ).toEqual( -( 2 * SECOND ) );
		expect( updateInfo.updates ).toEqual( [ '1' ] );
	} );
} );

describe( 'calculateClientUpdates', () => {
	const clientRequirements = {
		primaryStuff: {
			1: { freshness: 90 * SECOND, timeout: 30 * SECOND },
			2: { freshness: 120 * SECOND, timeout: 30 * SECOND },
			3: { freshness: 180 * SECOND, timeout: 30 * SECOND },
			4: { freshness: 240 * SECOND, timeout: 30 * SECOND },
		},
		secondaryStuff: {
			11: { freshness: 240 * SECOND, timeout: 15 * SECOND },
			12: { freshness: 150 * SECOND, timeout: 15 * SECOND },
			13: { freshness: 100 * SECOND, timeout: 15 * SECOND },
			14: { freshness: 60 * SECOND, timeout: 15 * SECOND },
		},
		emptyStuff: {
		},
	};

	it( 'should give default update info when there are no requirements', () => {
		const now = new Date();
		const clientState = {};

		const updateInfo = calculateClientUpdates( {}, clientState, now );
		expect( updateInfo ).toEqual( { updates: {}, nextUpdate: DEFAULT_NEXT_UPDATE } );
	} );

	it( 'should update info when there are no previous requirements', () => {
		const now = new Date();
		const clientState = {};

		const updateInfo = calculateClientUpdates( {}, clientState, now );
		expect( updateInfo ).toEqual( { updates: {}, nextUpdate: DEFAULT_NEXT_UPDATE } );
	} );

	it( 'should give updates for multiple endpoints', () => {
		const now = new Date();
		const clientState = {
			primaryStuff: {
				1: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
				2: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
				3: {
					lastReceived: new Date( now - ( 110 * SECOND ) ),
					lastRequested: new Date( now - ( 35 * SECOND ) ),
				},
				4: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
			},
			secondaryStuff: {
				11: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
				12: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
				13: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
				14: { lastReceived: new Date( now - ( 110 * SECOND ) ) },
			}
		};

		const updateInfo = calculateClientUpdates( clientRequirements, clientState, now );
		expect( updateInfo.updates ).toEqual( {
			primaryStuff: [ '1', '3' ],
			secondaryStuff: [ '13', '14' ],
			emptyStuff: [],
		} );
		expect( updateInfo.nextUpdate ).toEqual( -( 50 * SECOND ) );
	} );
} );

