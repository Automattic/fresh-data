import requireData from '../require-data';
import { SECOND } from '../../utils/constants';

describe( 'requireData', () => {
	it( 'should append a requirement for a top-level endpoint.', () => {
		const componentRequirements = [];
		const requirement = { freshness: 90 * SECOND };
		requireData( componentRequirements )( requirement, [ 'things' ] );
		expect( componentRequirements ).toEqual( [
			{ freshness: 90 * SECOND, endpoint: [ 'things' ] },
		] );
	} );

	it( 'should append a requirement for a nested endpoint.', () => {
		const componentRequirements = [];
		const requirement = { freshness: 90 * SECOND };
		requireData( componentRequirements )( requirement, [ 'things', 1, 'foot', 'red' ] );
		expect( componentRequirements ).toEqual( [
			{ freshness: 90 * SECOND, endpoint: [ 'things', 1, 'foot', 'red' ] },
		] );
	} );

	it( 'should append a requirement for a query.', () => {
		const componentRequirements = [];
		const requirement = { freshness: 90 * SECOND };
		const params = { page: 1, perPage: 3 };
		requireData( componentRequirements )( requirement, [ 'things' ], params );
		expect( componentRequirements ).toEqual( [
			{ freshness: 90 * SECOND, endpoint: [ 'things' ], params },
		] );
	} );
} );
