import { SECOND } from '../../utils/constants';
import {
	DEFAULTS,
	addRequirementParams,
	addEndpointRequirement,
	combineComponentRequirements,
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

	it( 'should add a query requirement with params, a single level deep', () => {
		const reqs = {};
		const params = { page: 1, perPage: 10 };
		addEndpointRequirement( reqs, { freshness: 90 * SECOND }, [ 'thing' ], params );
		expect( reqs ).toEqual( {
			thing: {
				queries: [
					{
						params: { page: 1, perPage: 10 },
						freshness: 90 * SECOND,
						timeout: DEFAULTS.timeout
					},
				],
			},
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
		reqsByComponent.set( component, [ { freshness: 180 * SECOND, endpoint: [ 'thing', 2 ] } ] );

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
		reqsByComponent.set( component1, [ { freshness: 60 * SECOND, endpoint: [ 'thing', 1 ] } ] );
		reqsByComponent.set( component2, [ { freshness: 90 * SECOND, endpoint: [ 'thing', 2 ] } ] );

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
		reqsByComponent.set( component1, [ { freshness: 30 * SECOND, endpoint: [ 'thing', 2 ] } ] );
		reqsByComponent.set( component2, [ { freshness: 60 * SECOND, timeout: 2 * SECOND, endpoint: [ 'thing', 2 ] } ] );

		const reqsByEndpoint = combineComponentRequirements( reqsByComponent );
		expect( reqsByEndpoint ).toEqual( {
			thing: {
				endpoints: {
					2: { freshness: 30 * SECOND, timeout: 2 * SECOND },
				},
			},
		} );
	} );

	it( 'should utilize multiple requirements from one component.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		reqsByComponent.set( component1, [
			{ freshness: 60 * SECOND, endpoint: [ 'thing', 1 ] },
			{ freshness: 30 * SECOND, endpoint: [ 'thing', 2 ] },
		] );

		const reqsByEndpoint = combineComponentRequirements( reqsByComponent );
		expect( reqsByEndpoint ).toEqual( {
			thing: {
				endpoints: {
					1: { freshness: 60 * SECOND, timeout: DEFAULTS.timeout },
					2: { freshness: 30 * SECOND, timeout: DEFAULTS.timeout },
				},
			},
		} );
	} );

	it( 'should collapse redundant requirements from one component.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		reqsByComponent.set( component1, [
			{ freshness: 60 * SECOND, endpoint: [ 'thing', 1 ] },
			{ freshness: 30 * SECOND, endpoint: [ 'thing', 1 ] },
		] );

		const reqsByEndpoint = combineComponentRequirements( reqsByComponent );
		expect( reqsByEndpoint ).toEqual( {
			thing: {
				endpoints: {
					1: { freshness: 30 * SECOND, timeout: DEFAULTS.timeout },
				},
			},
		} );
	} );
} );
