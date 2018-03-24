import { SECOND } from '../../utils/constants';
import {
	DEFAULTS,
	reduceEndpointRequirements,
	reduceItemRequirements,
} from '../requirements';

describe( 'reduceItemRequirements', () => {
	it( 'should not update when nothing has changed', () => {
		const reqs = reduceItemRequirements( DEFAULTS, { ...DEFAULTS } );
		expect( reqs ).toBe( DEFAULTS );
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
