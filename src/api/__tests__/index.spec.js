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
			expect( api.dataHandlers ).toEqual( null );
		} );
	} );

	describe( '#setDataHandlers', () => {
		it( 'should set dataRequested and dataReceived', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();

			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( { dataRequested, dataReceived } );

			expect( api.dataHandlers.dataRequested ).toBe( dataRequested );
			expect( api.dataHandlers.dataReceived ).toBe( dataReceived );
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

	describe( '#dataRequested', () => {
		const clientKey = 'client1';

		it( 'should do nothing if dataRequested is not set.', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.dataRequested( clientKey, [ 'thing:2' ] );
		} );

		it( 'should call dataRequested', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( { dataRequested, dataReceived } );
			api.dataRequested( clientKey, [ 'thing:3', 'thing:4' ] );

			expect( dataReceived ).not.toHaveBeenCalled();
			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( api, clientKey, [ 'thing:3', 'thing:4' ] );
		} );
	} );

	describe( '#dataReceived', () => {
		const clientKey = 'client1';

		it( 'should do nothing if dataReceived is not set.', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.dataReceived( clientKey, { 'thing:2': { data: { color: 'grey' } } } );
		} );

		it( 'should call dataReceived', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( { dataRequested, dataReceived } );
			api.dataReceived( clientKey, {
				'thing:3': { data: { color: 'grey' } },
				'thing:4': { error: { message: 'oops' } }
			} );

			expect( dataRequested ).not.toHaveBeenCalled();
			expect( dataReceived ).toHaveBeenCalledTimes( 1 );
			expect( dataReceived ).toHaveBeenCalledWith( api, clientKey, {
				'thing:3': { data: { color: 'grey' } },
				'thing:4': { error: { message: 'oops' } },
			} );
		} );
	} );

	describe( '#unhandledErrorReceived', () => {
		it( 'should do nothing but log to debug by default.', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.unhandledErrorReceived( '123', 'cook', [ 'dish:1', 'dish:2' ], { message: 'Bork! Bork! Bork!' } );
		} );
	} );
} );
