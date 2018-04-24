import isApiValid from '../is-api-valid';

describe( 'isApiValid', () => {
	it( 'should be false when api is not an object', () => {
		expect( isApiValid( undefined ) ).toBeFalsy();
		expect( isApiValid( null ) ).toBeFalsy();
		expect( isApiValid( 'invalid string' ) ).toBeFalsy();
		expect( isApiValid( 5 ) ).toBeFalsy();
	} );
} );
