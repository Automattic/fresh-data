import { SECOND } from '../../utils/constants';
import calculateUpdates, {
	DEFAULT_NEXT_UPDATE,
	calculateEndpointUpdates,
	calculateNextItemUpdate,
} from '../calculate-updates';

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

		const updateInfo = calculateUpdates( {}, clientState, now );
		expect( updateInfo ).toEqual( { updates: {}, nextUpdate: DEFAULT_NEXT_UPDATE } );
	} );

	it( 'should update info when there are no previous requirements', () => {
		const now = new Date();
		const clientState = {};

		const updateInfo = calculateUpdates( {}, clientState, now );
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

		const updateInfo = calculateUpdates( clientRequirements, clientState, now );
		expect( updateInfo.updates ).toEqual( {
			primaryStuff: [ '1', '3' ],
			secondaryStuff: [ '13', '14' ],
			emptyStuff: [],
		} );
		expect( updateInfo.nextUpdate ).toEqual( -( 50 * SECOND ) );
	} );
} );
