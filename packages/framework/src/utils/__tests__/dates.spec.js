import { isDateEarlier } from '../dates';

describe( 'isDateEarlier', () => {
	it( 'returns false an exact match', () => {
		const now = new Date();
		expect( isDateEarlier( now, now ) ).toBe( false );
	} );

	it( 'returns true if no existing date', () => {
		const now = new Date();
		expect( isDateEarlier( null, now ) ).toBe( true );
	} );

	it( 'returns false if no new date', () => {
		const now = new Date();
		expect( isDateEarlier( now, null ) ).toBe( false );
	} );

	it( 'returns true for one millisecond earlier', () => {
		const now = new Date();
		const earlier = new Date( now.getTime() - 1 );
		expect( isDateEarlier( now, earlier ) ).toBe( true );
	} );

	it( 'returns false for one millisecond later', () => {
		const now = new Date();
		const later = new Date( now.getTime() + 1 );
		expect( isDateEarlier( now, later ) ).toBe( false );
	} );
} );
