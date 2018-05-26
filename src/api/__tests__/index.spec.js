import ApiClient from '../../client/index';
import FreshDataApi from '../index';

describe( 'api', () => {
	describe( '#constructor', () => {
		it( 'should initialize clients map', () => {
			const api = new FreshDataApi();
			expect( api.clients ).toEqual( new Map() );
		} );

		it( 'should initialize state', () => {
			const api = new FreshDataApi();
			expect( api.state ).toEqual( {} );
		} );

		it( 'should initialize dataHandlers', () => {
			const api = new FreshDataApi();
			expect( api.dataHandlers ).toEqual( {} );
		} );

		it( 'should use api methods defined in subclass', () => {
			const methods = { get: () => {} };
			class MyApi extends FreshDataApi {
				static methods = methods;
			}
			const api = new MyApi();
			expect( api.methods ).toBe( methods );
		} );

		it( 'should use endpoint methods defined in subclass', () => {
			const endpoints = { things: { read: () => {} } };
			class MyApi extends FreshDataApi {
				static endpoints = endpoints;
			}
			const api = new MyApi();
			expect( api.endpoints ).toBe( endpoints );
		} );

		it( 'should use selector methods defined in subclass', () => {
			const selectors = { getThings: () => () => {} };
			class MyApi extends FreshDataApi {
				static selectors = selectors;
			}
			const api = new MyApi();
			expect( api.selectors ).toBe( selectors );
		} );
	} );

	describe( '#setDataHandlers', () => {
		it( 'should set dataHandlers', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			const errorReceived = jest.fn();

			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( dataRequested, dataReceived, errorReceived );

			expect( api.dataHandlers.dataRequested ).toBe( dataRequested );
			expect( api.dataHandlers.dataReceived ).toBe( dataReceived );
			expect( api.dataHandlers.errorReceived ).toBe( errorReceived );
		} );
	} );

	describe( '#createClient', () => {
		it( 'should create a client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.createClient( 'myKey' );

			expect( client ).toBeInstanceOf( ApiClient );
			expect( client.key ).toBe( 'myKey' );
			expect( api.clients.size ).toBe( 1 );
			expect( api.clients.get( 'myKey' ) ).toEqual( client );
		} );
	} );

	describe( '#findClient', () => {
		it( 'should find an existing client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.createClient( 'myKey' );
			const foundClient = api.findClient( 'myKey' );

			expect( foundClient ).toBe( client );
		} );

		it( 'should not find an existing client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.createClient( 'myKey' );
			const foundClient = api.findClient( 'myKeey' );

			expect( foundClient ).not.toBe( client );
			expect( foundClient ).toBeNull();
		} );
	} );

	describe( '#getClient', () => {
		it( 'should get an existing client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.createClient( 'myKey' );
			const foundClient = api.getClient( 'myKey' );

			expect( foundClient ).toBe( client );
			expect( api.clients.size ).toBe( 1 );
		} );

		it( 'should create a non-existing client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.getClient( 'myKey' );

			expect( client ).toBeInstanceOf( ApiClient );
			expect( client.key ).toBe( 'myKey' );
			expect( api.clients.size ).toBe( 1 );
			expect( api.clients.get( 'myKey' ) ).toEqual( client );
		} );
	} );

	describe( '#updateState', () => {
		it( 'should update its own state', () => {
			const state = { one: 'one' };
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();

			api.updateState( state );

			expect( api.state ).toBe( state );
		} );

		it( 'should update state for each client', () => {
			const client1State = {};
			const client2State = {};
			const state = { client1: client1State, client2: client2State };
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client1 = api.getClient( 'client1' );
			const client2 = api.getClient( 'client2' );

			api.updateState( state );

			expect( api.state ).toBe( state );
			expect( client1.state ).toBe( client1State );
			expect( client2.state ).toBe( client2State );
		} );

		it( 'should only set client state if state is not identical', () => {
			const client1State = { client1: 1 };
			const client1State2 = { client1: 2 };
			const client2State = { client2: 1 };
			const state = { client1: client1State, client2: client2State };
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client1 = api.getClient( 'client1' );
			const client2 = api.getClient( 'client2' );
			api.updateState( state );

			client1.setState = jest.fn();
			client2.setState = jest.fn();
			api.updateState( state );

			expect( client1.setState ).not.toHaveBeenCalled();
			expect( client2.setState ).not.toHaveBeenCalled();

			client1.setState = jest.fn();
			client2.setState = jest.fn();
			api.updateState( { client1: client1State2, client2: client2State } );

			expect( client1.setState ).toHaveBeenCalledTimes( 1 );
			expect( client1.setState ).toHaveBeenCalledWith( client1State2 );
			expect( client2.setState ).not.toHaveBeenCalled();
		} );

		it( 'should set default state for client', () => {
			const client1State = {};
			const state = { client1: client1State };
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client1 = api.getClient( 'client1' );
			const client2 = api.getClient( 'client2' );

			api.updateState( state );

			expect( api.state ).toBe( state );
			expect( client1.state ).toBe( client1State );
			expect( client2.state ).toEqual( {} );
		} );
	} );

	describe( 'data handler functions', () => {
		const clientKey = 'client1';
		const endpointPath = [ 'things' ];
		const params = { param1: 'one' };
		const data = { one: 'red', two: 'blue' };
		const error = { message: 'oops!' };

		describe( '#dataRequested', () => {
			it( 'should do nothing if data handler is not set.', () => {
				class MyApi extends FreshDataApi {
				}
				const api = new MyApi();
				api.dataRequested( clientKey, endpointPath, params );
			} );

			it( 'should call data handler', () => {
				const dataRequested = jest.fn();
				class MyApi extends FreshDataApi {
				}
				const api = new MyApi();
				api.setDataHandlers( dataRequested, null, null );
				api.dataRequested( clientKey, endpointPath, params );

				expect( dataRequested ).toHaveBeenCalledTimes( 1 );
				expect( dataRequested ).toHaveBeenCalledWith( api, clientKey, endpointPath, params );
			} );
		} );

		describe( '#dataReceived', () => {
			it( 'should do nothing if data handler is not set.', () => {
				class MyApi extends FreshDataApi {
				}
				const api = new MyApi();
				api.dataReceived( clientKey, endpointPath, params );
			} );

			it( 'should call data handler', () => {
				const dataReceived = jest.fn();
				class MyApi extends FreshDataApi {
				}
				const api = new MyApi();
				api.setDataHandlers( null, dataReceived, null );
				api.dataReceived( clientKey, endpointPath, params, data );

				expect( dataReceived ).toHaveBeenCalledTimes( 1 );
				expect( dataReceived ).toHaveBeenCalledWith( api, clientKey, endpointPath, params, data );
			} );
		} );

		describe( '#errorReceived', () => {
			it( 'should do nothing if data handler is not set.', () => {
				class MyApi extends FreshDataApi {
				}
				const api = new MyApi();
				api.errorReceived( clientKey, endpointPath, params );
			} );

			it( 'should call data handler', () => {
				const errorReceived = jest.fn();
				class MyApi extends FreshDataApi {
				}
				const api = new MyApi();
				api.setDataHandlers( null, null, errorReceived );
				api.errorReceived( clientKey, endpointPath, params, error );

				expect( errorReceived ).toHaveBeenCalledTimes( 1 );
				expect( errorReceived ).toHaveBeenCalledWith( api, clientKey, endpointPath, params, error );
			} );
		} );
	} );
} );
