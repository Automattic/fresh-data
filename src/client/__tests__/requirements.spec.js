import { SECOND } from '../../utils/constants';
import {
	DEFAULT_NEXT_UPDATE,
	DEFAULTS,
	addRequirementParams,
	addEndpointRequirement,
	combineComponentRequirements,
	calculateClientUpdates,
	calculateEndpointUpdates,
	calculateNextItemUpdate,
} from '../requirements';

describe( 'addRequirementParams', () => {
	it( 'should set defaults if not given.', () => {
		const endpointRequirements = {};
		addRequirementParams( endpointRequirements, {} );
		expect( endpointRequirements.freshness ).toEqual( DEFAULTS.freshness );
		expect( endpointRequirements.timeout ).toEqual( DEFAULTS.timeout );
	} );
	it( 'should set freshness if not previously set.', () => {
		const endpointRequirements = {};
		addRequirementParams( endpointRequirements, { freshness: 30 * SECOND } );
		expect( endpointRequirements.freshness ).toEqual( 30 * SECOND );
	} );

	it( 'should set timeout if not previously set.', () => {
		const endpointRequirements = {};
		addRequirementParams( endpointRequirements, { timeout: 5 * SECOND } );
		expect( endpointRequirements.timeout ).toEqual( 5 * SECOND );
	} );

	it( 'should not change freshness if new value is higher.', () => {
		const endpointRequirements = { freshness: 20 * SECOND };
		addRequirementParams( endpointRequirements, { freshness: 30 * SECOND } );
		expect( endpointRequirements.freshness ).toEqual( 20 * SECOND );
	} );

	it( 'should not change timeout if new value is higher.', () => {
		const endpointRequirements = { timeout: 4 * SECOND };
		addRequirementParams( endpointRequirements, { timeout: 5 * SECOND } );
		expect( endpointRequirements.timeout ).toEqual( 4 * SECOND );
	} );

	it( 'should not change any other properties in the object', () => {
		const endpointRequirements = {
			freshness: 50 * SECOND,
			timeout: 10 * SECOND,
			endpoints: { 1: {}, 2: {} },
			queries: [ { params: { a: 'a' } }, { params: { b: 'b' } } ],
		};
		addRequirementParams(
			endpointRequirements,
			{ freshness: 40 * SECOND, timeout: 5 * SECOND }
		);
		expect( endpointRequirements.endpoints ).toEqual( { 1: {}, 2: {} } );
		expect( endpointRequirements.queries ).toEqual(
			[ { params: { a: 'a' } }, { params: { b: 'b' } } ]
		);
		expect( endpointRequirements.freshness ).toEqual( 40 * SECOND );
		expect( endpointRequirements.timeout ).toEqual( 5 * SECOND );
	} );
} );

describe( 'addEndpointRequirement', () => {
	it( 'should add a requirement with no params, a single level deep', () => {
		const reqs = {};
		addEndpointRequirement( reqs, { freshness: 90 * SECOND }, [ 'thing' ] );
		expect( reqs ).toEqual( {
			thing: { freshness: 90 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should add a requirement two levels deep', () => {
		const reqs = {};
		addEndpointRequirement(
			reqs,
			{ freshness: 10 * SECOND, timeout: 2 * SECOND },
			[ 'thing', 2 ]
		);
		expect( reqs ).toEqual( {
			thing: {
				endpoints: {
					2: { freshness: 10 * SECOND, timeout: 2 * SECOND },
				},
			},
		} );
	} );

	it( 'should add requirements several levels deep', () => {
		const reqs = {};
		addEndpointRequirement(
			reqs,
			{ freshness: 20 * SECOND },
			[ 'thing', 1, 'foot', 'red', 1 ]
		);
		addEndpointRequirement(
			reqs,
			{ freshness: 30 * SECOND },
			[ 'thing', 2, 'foot', 'blue', 2 ]
		);
		expect( reqs ).toEqual( {
			thing: {
				endpoints: {
					1: {
						endpoints: {
							foot: {
								endpoints: {
									red: {
										endpoints: {
											1: {
												freshness: 20 * SECOND,
												timeout: DEFAULTS.timeout
											},
										},
									},
								},
							},
						},
					},
					2: {
						endpoints: {
							foot: {
								endpoints: {
									blue: {
										endpoints: {
											2: {
												freshness: 30 * SECOND,
												timeout: DEFAULTS.timeout
											},
										},
									},
								},
							},
						},
					},
				},
			},
		} );
	} );

	it( 'should not change when adding a requirement that already exists', () => {
		const reqs = {};
		addEndpointRequirement( reqs, { freshness: 20 * SECOND }, [ 'thing' ] );
		addEndpointRequirement( reqs, { freshness: 20 * SECOND }, [ 'thing' ] );
		expect( reqs ).toEqual( {
			thing: { freshness: 20 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should not change when adding a requirement that is superceded by another', () => {
		const reqs = {};
		addEndpointRequirement( reqs, { freshness: 20 * SECOND }, [ 'thing' ] );
		addEndpointRequirement( reqs, { timeout: 3 * SECOND }, [ 'thing' ] );
		addEndpointRequirement( reqs, { freshness: 60 * SECOND }, [ 'thing' ] );
		addEndpointRequirement( reqs, { timeout: 5 * SECOND }, [ 'thing' ] );
		expect( reqs ).toEqual( {
			thing: { freshness: 20 * SECOND, timeout: 3 * SECOND },
		} );
	} );
} );

describe( 'combineComponentRequirements', () => {
	it( 'should return empty if no components are in the map.', () => {
		const reqsByEndpoint = combineComponentRequirements( new Map() );
		expect( reqsByEndpoint ).toEqual( {} );
	} );

	it( 'should return endpoint requirements for a single component.', () => {
		const reqsByComponent = new Map();
		const component = () => null;
		reqsByComponent.set( component, { freshness: 180 * SECOND, endpoint: [ 'thing', 2 ] } );

		const reqsByEndpoint = combineComponentRequirements( reqsByComponent );
		expect( reqsByEndpoint ).toEqual( {
			thing: {
				endpoints: {
					2: { freshness: 180 * SECOND, timeout: DEFAULTS.timeout },
				},
			},
		} );
	} );

	it( 'should return endpoint requirements for multiple components.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		const component2 = () => null;
		reqsByComponent.set( component1, { freshness: 60 * SECOND, endpoint: [ 'thing', 1 ] } );
		reqsByComponent.set( component2, { freshness: 90 * SECOND, endpoint: [ 'thing', 2 ] } );

		const reqsByEndpoint = combineComponentRequirements( reqsByComponent );
		expect( reqsByEndpoint ).toEqual( {
			thing: {
				endpoints: {
					1: { freshness: 60 * SECOND, timeout: DEFAULTS.timeout },
					2: { freshness: 90 * SECOND, timeout: DEFAULTS.timeout },
				},
			},
		} );
	} );

	it( 'should combine requirements for the same endpoint.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		const component2 = () => null;
		reqsByComponent.set( component1, { freshness: 30 * SECOND, endpoint: [ 'thing', 2 ] } );
		reqsByComponent.set( component2, { freshness: 60 * SECOND, timeout: 2 * SECOND, endpoint: [ 'thing', 2 ] } );

		const reqsByEndpoint = combineComponentRequirements( reqsByComponent );
		expect( reqsByEndpoint ).toEqual( {
			thing: {
				endpoints: {
					2: { freshness: 30 * SECOND, timeout: 2 * SECOND },
				},
			},
		} );
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

