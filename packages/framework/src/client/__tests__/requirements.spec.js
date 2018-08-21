import { SECOND } from '../../utils/constants';
import {
	DEFAULTS,
	addRequirementParams,
	addResourceRequirement,
	combineComponentRequirements,
} from '../requirements';

describe( 'addRequirementParams', () => {
	it( 'should set defaults if not given.', () => {
		const requirements = {};
		addRequirementParams( requirements, {} );
		expect( requirements.freshness ).toEqual( DEFAULTS.freshness );
		expect( requirements.timeout ).toEqual( DEFAULTS.timeout );
	} );
	it( 'should set freshness if not previously set.', () => {
		const requirements = {};
		addRequirementParams( requirements, { freshness: 30 * SECOND } );
		expect( requirements.freshness ).toEqual( 30 * SECOND );
	} );

	it( 'should set timeout if not previously set.', () => {
		const requirements = {};
		addRequirementParams( requirements, { timeout: 5 * SECOND } );
		expect( requirements.timeout ).toEqual( 5 * SECOND );
	} );

	it( 'should not change freshness if new value is higher.', () => {
		const requirements = { freshness: 20 * SECOND };
		addRequirementParams( requirements, { freshness: 30 * SECOND } );
		expect( requirements.freshness ).toEqual( 20 * SECOND );
	} );

	it( 'should not change timeout if new value is higher.', () => {
		const requirements = { timeout: 4 * SECOND };
		addRequirementParams( requirements, { timeout: 5 * SECOND } );
		expect( requirements.timeout ).toEqual( 4 * SECOND );
	} );
} );

describe( 'addResourceRequirement', () => {
	it( 'should add a requirement with no params', () => {
		const reqs = {};
		addResourceRequirement( reqs, { freshness: 90 * SECOND }, 'thing:1' );
		expect( reqs ).toEqual( {
			'thing:1': { freshness: 90 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should combine a requirement with an existing one', () => {
		const reqs = {};
		addResourceRequirement( reqs, { freshness: 90 * SECOND }, 'thing:1' );
		addResourceRequirement( reqs, { freshness: 60 * SECOND }, 'thing:1' );
		expect( reqs ).toEqual( {
			'thing:1': { freshness: 60 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should only combine with a matching resource name', () => {
		const reqs = {};
		addResourceRequirement( reqs, { freshness: 60 * SECOND }, 'thing:1' );
		addResourceRequirement( reqs, { freshness: 90 * SECOND }, 'thing-page:{page:1,perPage:10}' );
		addResourceRequirement( reqs, { freshness: 30 * SECOND }, 'thing:1' );
		expect( reqs ).toEqual( {
			'thing:1': { freshness: 30 * SECOND, timeout: DEFAULTS.timeout },
			'thing-page:{page:1,perPage:10}': { freshness: 90 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should not change when adding a requirement that already exists', () => {
		const reqs = {};
		addResourceRequirement( reqs, { freshness: 20 * SECOND }, 'thing:1' );
		addResourceRequirement( reqs, { freshness: 20 * SECOND }, 'thing:1' );
		expect( reqs ).toEqual( {
			'thing:1': { freshness: 20 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should not change when adding a requirement that is superceded by another', () => {
		const reqs = {};
		addResourceRequirement( reqs, { freshness: 20 * SECOND }, 'thing:1' );
		addResourceRequirement( reqs, { timeout: 3 * SECOND }, 'thing:1' );
		addResourceRequirement( reqs, { freshness: 60 * SECOND }, 'thing:1' );
		addResourceRequirement( reqs, { timeout: 5 * SECOND }, 'thing:1' );
		expect( reqs ).toEqual( {
			'thing:1': { freshness: 20 * SECOND, timeout: 3 * SECOND },
		} );
	} );
} );

describe( 'combineComponentRequirements', () => {
	it( 'should return empty if no components are in the map.', () => {
		const reqsByResource = combineComponentRequirements( new Map() );
		expect( reqsByResource ).toEqual( {} );
	} );

	it( 'should return resource requirements for a single component.', () => {
		const reqsByComponent = new Map();
		const component = () => null;
		reqsByComponent.set( component, [ { freshness: 180 * SECOND, resourceName: 'thing:2' } ] );

		const reqsByResource = combineComponentRequirements( reqsByComponent );
		expect( reqsByResource ).toEqual( {
			'thing:2': { freshness: 180 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should return resource requirements for multiple components.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		const component2 = () => null;
		reqsByComponent.set( component1, [ { freshness: 60 * SECOND, resourceName: 'thing:1' } ] );
		reqsByComponent.set( component2, [ { freshness: 90 * SECOND, resourceName: 'thing:2' } ] );

		const reqsByResource = combineComponentRequirements( reqsByComponent );
		expect( reqsByResource ).toEqual( {
			'thing:1': { freshness: 60 * SECOND, timeout: DEFAULTS.timeout },
			'thing:2': { freshness: 90 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should combine requirements for the same resource.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		const component2 = () => null;
		reqsByComponent.set( component1, [ { freshness: 30 * SECOND, resourceName: 'thing:2' } ] );
		reqsByComponent.set( component2, [ { freshness: 60 * SECOND, timeout: 2 * SECOND, resourceName: 'thing:2' } ] );

		const reqsByResource = combineComponentRequirements( reqsByComponent );
		expect( reqsByResource ).toEqual( {
			'thing:2': { freshness: 30 * SECOND, timeout: 2 * SECOND },
		} );
	} );

	it( 'should utilize multiple requirements from one component.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		reqsByComponent.set( component1, [
			{ freshness: 60 * SECOND, resourceName: 'thing:1' },
			{ freshness: 30 * SECOND, resourceName: 'thing:2' },
		] );

		const reqsByResource = combineComponentRequirements( reqsByComponent );
		expect( reqsByResource ).toEqual( {
			'thing:1': { freshness: 60 * SECOND, timeout: DEFAULTS.timeout },
			'thing:2': { freshness: 30 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );

	it( 'should collapse redundant requirements from one component.', () => {
		const reqsByComponent = new Map();
		const component1 = () => null;
		reqsByComponent.set( component1, [
			{ freshness: 60 * SECOND, resourceName: 'thing:1' },
			{ freshness: 30 * SECOND, resourceName: 'thing:1' },
		] );

		const reqsByResource = combineComponentRequirements( reqsByComponent );
		expect( reqsByResource ).toEqual( {
			'thing:1': { freshness: 30 * SECOND, timeout: DEFAULTS.timeout },
		} );
	} );
} );
