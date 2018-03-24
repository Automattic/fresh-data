import { registerApi } from '../index';

describe( 'registerApi', () => {
	it( 'should not register a null api object', () => {
		const apis = new Map();
		expect( () => registerApi( null, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object without a name', () => {
		const apis = new Map();
		const api = { methods: {}, endpoints: {}, selectors: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object with an invalid name', () => {
		const apis = new Map();
		const api = { name: 234, methods: {}, endpoints: {}, selectors: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object without methods', () => {
		const apis = new Map();
		const api = { name: 'testapi', endpoints: {}, selectors: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object with invalid methods', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: 'invalid-methods', endpoints: {}, selectors: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object without endpoints', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: {}, selectors: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object with invalid endpoints', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: {}, endpoints: 'invalid-endpoints', selectors: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object without selectors', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: {}, endpoints: {} };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should not register an api object with invalid selectors', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: {}, endpoints: {}, selectors: 'invalid-selectors' };
		expect( () => registerApi( api, apis ) ).toThrowError( 'Invalid API object' );
		expect( apis.size ).toBe( 0 );
	} );

	it( 'should register a valid api object', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: {}, endpoints: {}, selectors: {} };
		registerApi( api, apis );
		expect( apis.size ).toBe( 1 );
		expect( apis.get( 'testapi' ) ).toBe( api );
	} );

	it( 'should not register an api object twice', () => {
		const apis = new Map();
		const api = { name: 'testapi', methods: {}, endpoints: {}, selectors: {} };
		expect( registerApi( api, apis ).get( 'testapi' ) ).toBe( api );
		expect( () => registerApi( api, apis ) ).toThrowError( 'API "testapi" already registered' );
		expect( apis.get( 'testapi' ) ).toBe( api );
	} );
} );

