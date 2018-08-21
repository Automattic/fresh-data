import ApiClient from '../../client/index';
import FreshDataApi from '../index';

describe( 'api', () => {
	describe( '#constructor', () => {
		it( 'should initialize client to null', () => {
			const api = new FreshDataApi();
			expect( api.client ).toBeNull();
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
			const client = api.createClient();

			expect( client ).toBeInstanceOf( ApiClient );
			expect( api.client ).toBe( client );
		} );
	} );

	describe( '#getClient', () => {
		it( 'should get an existing client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.createClient();
			const foundClient = api.getClient();

			expect( foundClient ).toBe( client );
			expect( api.client ).toBe( client );
		} );

		it( 'should create a non-existing client', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.getClient();

			expect( client ).toBeInstanceOf( ApiClient );
			expect( api.client ).toBe( client );
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

		it( 'should update state for the client', () => {
			const state = {};
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.getClient();

			api.updateState( state );

			expect( api.state ).toBe( state );
			expect( client.state ).toBe( state );
		} );

		it( 'should only set state if state is not identical', () => {
			const state1 = { value: 1 };
			const state2 = { value: 1 };
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const client = api.getClient();
			api.updateState( state1 );

			client.setState = jest.fn();
			api.updateState( state1 );

			expect( client.setState ).not.toHaveBeenCalled();

			client.setState = jest.fn();
			api.updateState( state2 );

			expect( client.setState ).toHaveBeenCalledTimes( 1 );
			expect( client.setState ).toHaveBeenCalledWith( state2 );
		} );
	} );

	describe( '#dataRequested', () => {
		it( 'should do nothing if dataRequested is not set.', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.dataRequested( [ 'thing:2' ] );
		} );

		it( 'should call dataRequested', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( { dataRequested, dataReceived } );
			api.dataRequested( [ 'thing:3', 'thing:4' ] );

			expect( dataReceived ).not.toHaveBeenCalled();
			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( [ 'thing:3', 'thing:4' ] );
		} );

		it( 'should return resourceNames given', () => {
			const resourceNames = [ 'thing:3', 'thing:4' ];
			const dataRequested = jest.fn();
			dataRequested.mockReturnValue( resourceNames );

			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( { dataRequested } );

			expect( api.dataRequested( resourceNames ) ).toBe( resourceNames );
		} );
	} );

	describe( '#dataReceived', () => {
		it( 'should do nothing if dataReceived is not set.', () => {
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.dataReceived( { 'thing:2': { data: { color: 'grey' } } } );
		} );

		it( 'should call dataReceived', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			api.setDataHandlers( { dataRequested, dataReceived } );
			api.dataReceived( {
				'thing:3': { data: { color: 'grey' } },
				'thing:4': { error: { message: 'oops' } }
			} );

			expect( dataRequested ).not.toHaveBeenCalled();
			expect( dataReceived ).toHaveBeenCalledTimes( 1 );
			expect( dataReceived ).toHaveBeenCalledWith( {
				'thing:3': { data: { color: 'grey' } },
				'thing:4': { error: { message: 'oops' } },
			} );
		} );

		it( 'should return resources', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			class MyApi extends FreshDataApi {
			}
			const api = new MyApi();
			const resources = {
				'thing:3': { data: { color: 'grey' } },
				'thing:4': { error: { message: 'oops' } },
			};

			api.setDataHandlers( { dataRequested, dataReceived } );
			expect( api.dataReceived( resources ) ).toBe( resources );
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
