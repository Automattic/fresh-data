import getData from '../get-data';

describe( 'getData', () => {
	it( 'should return null if clientState does not exist.', () => {
		const data = getData( null )( [ 'things', 1 ] );
		expect( data ).toBeNull();
	} );
	it( 'should return null if endpoint does not exist.', () => {
		const clientState = {
			endpoints: {
				things: {
				},
			},
		};
		const data = getData( clientState )( [ 'things', 1 ] );
		expect( data ).toBeNull();
	} );
	it( 'should return null if data is empty.', () => {
		const clientState = {
			endpoints: {
				things: {
					endpoints: {
						1: {},
					},
				},
			},
		};
		const data = getData( clientState )( [ 'things', 1 ] );
		expect( data ).toBeNull();
	} );
	it( 'should get state data for a given endpoint.', () => {
		const clientState = {
			endpoints: {
				things: {
					endpoints: {
						1: {
							data: { name: 'thing 1' },
						},
					},
				},
			},
		};
		const data = getData( clientState )( [ 'things', 1 ] );
		expect( data ).toEqual( { name: 'thing 1' } );
	} );
	it( 'should return null for a query if clientState does not exist.', () => {
		const params = { page: 1, perPage: 3 };
		const data = getData( null )( [ 'things' ], params );
		expect( data ).toBeNull();
	} );
	it( 'should return null for an endpoint with no queries.', () => {
		const clientState = {
			endpoints: {
				things: {},
			},
		};
		const params = { page: 1, perPage: 3 };
		const data = getData( clientState )( [ 'things' ], params );
		expect( data ).toBeNull();
	} );
	it( 'should return null for a query with no data.', () => {
		const clientState = {
			endpoints: {
				things: {
					queries: [
						{
							params: { page: 1, perPage: 3 },
						},
					],
				},
			},
		};
		const params = { page: 1, perPage: 3 };
		const data = getData( clientState )( [ 'things' ], params );
		expect( data ).toBeNull();
	} );
	it( 'should get state data for a given query.', () => {
		const clientState = {
			endpoints: {
				things: {
					queries: [
						{
							params: { page: 1, perPage: 3 },
							data: [
								{ name: 'thing 1' },
								{ name: 'thing 2' },
							],
						},
					],
				},
			},
		};
		const params = { page: 1, perPage: 3 };
		const data = getData( clientState )( [ 'things' ], params );
		expect( data ).toEqual( [
			{ name: 'thing 1' },
			{ name: 'thing 2' },
		] );
	} );
} );
