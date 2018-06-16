import FreshDataApi from '../../api';
import ApiClient, { DEFAULT_FETCH_TIMEOUT } from '../index';
import { SECOND } from '../../utils/constants';
import { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from '../calculate-updates';

describe( 'ApiClient', () => {
	const now = new Date();

	const emptyApi = new FreshDataApi();

	const thingSelectors = {
		getThing: ( getData, requireData ) => ( requirement, id ) => {
			const path = [ 'things', id ];
			requireData( requirement, path );
			return getData( path );
		},
		getThingPage: ( getData, requireData ) => ( requirement, page, perPage ) => {
			const path = [ 'things' ];
			const params = { page, perPage };
			requireData( requirement, path, params );
			return getData( path, params );
		},
	};

	const thing1 = { name: 'Thing 1' };
	const thing1ClientState = {
		endpoints: {
			things: {
				endpoints: {
					1: {
						lastRequested: now - ( 99 * SECOND ),
						lastReceived: now - ( 92 * SECOND ),
						data: thing1,
					},
				},
				queries: [
					{
						params: { page: 1, perPage: 3 },
						lastRequested: now - ( 80 * SECOND ),
						lastReceived: now - ( 81 * SECOND ),
						data: [ thing1 ]
					},
				],
			},
		},
	};

	it( 'should initialize to empty state', () => {
		const apiClient = new ApiClient( emptyApi, '123' );
		expect( apiClient.state ).toEqual( {} );
	} );

	it( 'should set state', () => {
		const clientState = { endpoints: {} };
		const apiClient = new ApiClient( emptyApi, '123' );
		apiClient.setState( clientState );
		expect( apiClient.state ).toBe( clientState );
	} );

	it( 'should map api methods to client key', () => {
		const checkMethod = jest.fn();
		class TestApi extends FreshDataApi {
			static methods = {
				get: ( clientKey ) => ( endpointPath ) => ( params ) => {
					checkMethod( 'get', clientKey, endpointPath, params );
				},
				post: ( clientKey ) => ( endpointPath ) => ( params ) => {
					checkMethod( 'post', clientKey, endpointPath, params );
				},
			};
		}
		const api = new TestApi();
		const dataRequested = jest.fn();
		const dataReceived = jest.fn();
		const errorReceived = jest.fn();
		api.setDataHandlers( dataRequested, dataReceived, errorReceived );
		const apiClient = new ApiClient( api, '123' );

		const thingsPath = [ 'things' ];
		const pageParams = { page: 1, perPage: 3 };
		apiClient.methods.get( thingsPath )( pageParams );
		expect( checkMethod ).toHaveBeenCalledWith( 'get', '123', thingsPath, pageParams );

		const thing2Path = [ 'things', 2 ];
		apiClient.methods.post( thing2Path )();
		expect( checkMethod ).toHaveBeenCalledWith( 'post', '123', thing2Path, undefined );
	} );

	it( 'should map mutations to endpoint operations', () => {
		const createThing = jest.fn();

		class TestApi extends FreshDataApi {
			static mutations = {
				createThing,
			};
		}

		const api = new TestApi();
		const apiClient = new ApiClient( api, '123' );

		expect( createThing ).toHaveBeenCalledTimes( 1 );
		expect( createThing ).toHaveBeenCalledWith( apiClient.endpointOperations );
	} );

	it( 'should map getData to current state', () => {
		class TestApi extends FreshDataApi {
			static selectors = thingSelectors;
		}
		const api = new TestApi();
		const apiClient = new ApiClient( api, '123' );
		apiClient.setState( thing1ClientState );

		const dataThing1 = apiClient.getData( [ 'things', 1 ] );
		expect( dataThing1 ).toBe( thing1 );

		const queryData = apiClient.getData( [ 'things' ], { page: 1, perPage: 3 } );
		expect( queryData ).toHaveLength( 1 );
		expect( queryData[ 0 ] ).toBe( thing1 );
	} );

	it( 'should start with no timeoutId', () => {
		const apiClient = new ApiClient( emptyApi, '123' );
		expect( apiClient.timeoutId ).toBeNull();
	} );

	describe( '#setComponentData', () => {
		class TestApi extends FreshDataApi {
			static endpoints = {
				things: {
					read: () => {},
				},
			};
			static selectors = thingSelectors;
		}
		const api = new TestApi();

		const component = () => {};
		let apiClient = null;

		beforeEach( () => {
			apiClient = new ApiClient( api, '123' );
		} );

		afterEach( () => {
			apiClient.setComponentData( component, null );
		} );

		it( 'should set and clear component requirements', () => {
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 60 * SECOND }, 1 );
			} );
			expect( apiClient.requirementsByComponent.size ).toEqual( 1 );
			expect( apiClient.requirementsByComponent.get( component ) ).toEqual( [
				{ freshness: 60 * SECOND, endpoint: [ 'things', 1 ] },
			] );

			apiClient.setComponentData( component, null );
			expect( apiClient.requirementsByComponent.size ).toEqual( 0 );
		} );

		it( 'should select data for component from last state set', () => {
			apiClient.setState( thing1ClientState );

			apiClient.setComponentData( component, ( selectors ) => {
				expect( selectors.getThing( {}, 1 ) ).toBe( thing1 );
			} );
		} );

		it( 'should set requirements for component', () => {
			apiClient.setState( thing1ClientState );

			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );

			const componentRequirements = apiClient.requirementsByComponent.get( component );
			expect( componentRequirements ).toEqual( [
				{
					freshness: 90 * SECOND,
					endpoint: [ 'things', 1 ],
				}
			] );
		} );
	} );

	describe( '#updateTimer', () => {
		it( 'should accept and use nextUpdate when given.', () => {
			const setTimer = jest.fn();
			setTimer.mockReturnValue( 5 ); // return a timeout id.
			const clearTimer = jest.fn();
			const apiClient = new ApiClient( emptyApi, '123', setTimer, clearTimer );
			apiClient.updateTimer( now, 5000 );

			expect( apiClient.timeoutId ).toBe( 5 );
			expect( setTimer ).toHaveBeenCalledTimes( 1 );
			expect( setTimer ).toHaveBeenCalledWith( apiClient.updateRequirementsData, 5000 );
			expect( clearTimer ).not.toHaveBeenCalled();
		} );

		it( 'should calculate nextUpdate when not given.', () => {
			class TestApi extends FreshDataApi {
				static selectors = thingSelectors;
			}
			const api = new TestApi();
			const setTimer = jest.fn();
			setTimer.mockReturnValue( 5 ); // return a timeout id.
			const clearTimer = jest.fn();
			const apiClient = new ApiClient( api, '123', setTimer, clearTimer );

			const component = () => {};
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 60 * SECOND }, 1 );
			}, now );

			apiClient.updateTimer( now, 5000 );

			expect( apiClient.timeoutId ).toBe( 5 );
			expect( setTimer ).toHaveBeenCalledTimes( 2 );
			expect( setTimer ).toHaveBeenCalledWith( apiClient.updateRequirementsData, DEFAULT_MIN_UPDATE );
			expect( setTimer ).toHaveBeenCalledWith( apiClient.updateRequirementsData, 5000 );
			expect( clearTimer ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should set timeout to maximum by default.', () => {
			const setTimer = jest.fn();
			setTimer.mockReturnValue( 5 ); // return a timeout id.
			const clearTimer = jest.fn();
			const apiClient = new ApiClient( emptyApi, '123', setTimer, clearTimer );

			apiClient.updateTimer( now );

			expect( apiClient.timeoutId ).toBe( 5 );
			expect( setTimer ).toHaveBeenCalledTimes( 1 );
			expect( setTimer ).toHaveBeenCalledWith( apiClient.updateRequirementsData, DEFAULT_MAX_UPDATE );
			expect( clearTimer ).not.toHaveBeenCalled();
		} );
	} );

	describe( '#updateRequirementsData', () => {
		class TestApi extends FreshDataApi {
			static endpoints = {
				things: {
					read: () => {},
				},
			};
			static selectors = thingSelectors;
		}
		const api = new TestApi();
		const component = () => {};
		let apiClient = null;

		beforeEach( () => {
			apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );
		} );

		afterEach( () => {
			apiClient.setComponentData( component, null );
		} );

		it( 'should not immediately trigger a requirements update when component requirements change.', () => {
			apiClient.updateRequirementsData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should fetch data when a new requirement is added for data that has never been fetched.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith(
				[ 'things', '3' ], undefined, DEFAULT_FETCH_TIMEOUT
			);
		} );

		it( 'should fetch data when a new requirement is added for data that is stale.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith(
				[ 'things', '1' ], undefined, DEFAULT_FETCH_TIMEOUT
			);
		} );

		it( 'should not fetch data when a new requirement is added for data that is fresh enough.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 95 * SECOND }, 1 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.fetchData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should fetch data when data for an existing requirement goes stale.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 100 * SECOND }, 1 );
			}, now );

			apiClient.updateRequirementsData( now );
			expect( apiClient.fetchData ).not.toHaveBeenCalled();

			const future = now.getTime() + ( 40 * SECOND );
			apiClient.updateRequirementsData( future );
			expect( apiClient.fetchData ).toHaveBeenCalledWith(
				[ 'things', '1' ], undefined, DEFAULT_FETCH_TIMEOUT
			);
		} );

		it( 'should fetch data for a query when a new requirement is added.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 10 );
			}, now );

			apiClient.updateRequirementsData( now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith(
				[ 'things' ], { page: 1, perPage: 10 }, DEFAULT_FETCH_TIMEOUT
			);
		} );

		it( 'should not fetch data for a query when a new requirement is already satisfied.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 3 );
			}, now );

			apiClient.updateRequirementsData( now );
			expect( apiClient.fetchData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should set timer for next update.', () => {
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 3 );
			}, now );

			expect( apiClient.timeoutId ).toBeGreaterThan( 0 );
		} );

		it( 'should clear timer when there are no component requirements.', () => {
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 3 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.timeoutId ).toBeGreaterThan( 0 );

			apiClient.setComponentData( component, null );
			apiClient.updateRequirementsData( now );
			expect( apiClient.timeoutId ).toBeNull();
		} );

		it( 'should not clear timer if it has been already cleared.', () => {
			apiClient.updateRequirementsData( now );

			apiClient.setTimer = jest.fn();
			apiClient.setTimer.mockReturnValue( 12 );
			apiClient.clearTimer = jest.fn();

			apiClient.setTimer = jest.fn();
			apiClient.clearTimer = jest.fn();
			apiClient.updateTimer = jest.fn();
			apiClient.updateRequirementsData( now );
			expect( apiClient.updateTimer ).not.toHaveBeenCalled();
			expect( apiClient.setTimer ).not.toHaveBeenCalled();
			expect( apiClient.clearTimer ).not.toHaveBeenCalled();
		} );

		it( 'should default endpointsState to empty object.', () => {
			apiClient.state = {};
			apiClient.updateRequirementsData( now );
		} );
	} );

	describe( '#fetchData', () => {
		it( 'should call the corresponding api endpoint read function.', () => {
			const readFunc = jest.fn();
			class TestApi extends FreshDataApi {
				static endpoints = {
					things: {
						read: readFunc,
					},
				};
				static methods = {};
			}
			const api = new TestApi();
			const apiClient = new ApiClient( api, '123' );

			apiClient.fetchData( [ 'things', '1' ], undefined, DEFAULT_FETCH_TIMEOUT );
			expect( readFunc ).toHaveBeenCalledWith( api.methods, [ '1' ], undefined );
		} );

		it( 'should call a nested api endpoint if it exists.', () => {
			const settingsReadFunc = jest.fn();
			const currencyReadFunc = jest.fn();
			class TestApi extends FreshDataApi {
				static endpoints = {
					settings: {
						read: settingsReadFunc,
						currency: {
							read: currencyReadFunc,
						},
					},
				};
				static methods = {};
			}
			const api = new TestApi();
			const apiClient = new ApiClient( api, '123' );

			apiClient.fetchData( [ 'settings', 'currency' ], undefined, DEFAULT_FETCH_TIMEOUT );
			expect( currencyReadFunc ).toHaveBeenCalledWith( api.methods, [], undefined );
			expect( settingsReadFunc ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should throw error if no read function is found.', () => {
			class TestApi extends FreshDataApi {
				static endpoints = {
					things: {},
				};
				static methods = {};
			}
			const api = new TestApi();
			const apiClient = new ApiClient( api, '123' );

			expect( () => apiClient.fetchData(
				[ 'things', '1' ], undefined, DEFAULT_FETCH_TIMEOUT
			) ).toThrowError();
		} );

		it( 'should throw error if no endpoint is found.', () => {
			class TestApi extends FreshDataApi {
				static methods = {};
				static endpoints = {};
			}
			const api = new TestApi();
			const apiClient = new ApiClient( api, '123' );

			expect( () => apiClient.fetchData(
				[ 'things', '1' ], undefined, DEFAULT_FETCH_TIMEOUT
			) ).toThrowError();
		} );

		it( 'should call waitForData', () => {
			const readValue = {};
			class TestApi extends FreshDataApi {
				static endpoints = {
					things: {
						read: () => ( readValue ),
					},
				};
				static methods = {};
			}
			const api = new TestApi();
			const apiClient = new ApiClient( api, '123' );

			apiClient.waitForData = jest.fn();
			apiClient.fetchData( [ 'things', '1' ], { param: true }, DEFAULT_FETCH_TIMEOUT );
			expect( apiClient.waitForData ).toHaveBeenCalledWith( [ 'things', '1' ], { param: true }, readValue, DEFAULT_FETCH_TIMEOUT );
		} );
	} );

	describe( '#waitForData', () => {
		it( 'should take a normal value and return it as a promise.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			const errorReceived = jest.fn();
			const dummyApi = new FreshDataApi();
			dummyApi.setDataHandlers( dataRequested, dataReceived, errorReceived );
			const apiClient = new ApiClient( dummyApi, '123' );
			const value = { foot: 'red' };

			const result = apiClient.waitForData( [ 'things', '1' ], undefined, value, 1500 );
			expect( result ).toBeInstanceOf( Promise );
			result.then( ( resultValue ) => {
				expect( resultValue ).toEqual(
					{ endpointPath: [ 'things', '1' ], params: undefined, data: value }
				);
			} );
		} );

		it( 'should take a promise as a value and wrap it in another promise.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			const errorReceived = jest.fn();
			const dummyApi = new FreshDataApi();
			dummyApi.setDataHandlers( dataRequested, dataReceived, errorReceived );
			dummyApi.dataHandlers.dataReceived = dataReceived;
			const apiClient = new ApiClient( dummyApi, '123' );
			const endpointPath = [ 'things', '1' ];
			const value = { foot: 'red' };
			const valuePromise = Promise.resolve().then( () => value );

			const result = apiClient.waitForData( endpointPath, undefined, valuePromise, 1500 );
			expect( result ).toBeInstanceOf( Promise );

			return result.then( ( resultValue ) => {
				expect( resultValue ).toEqual(
					{ endpointPath: [ 'things', '1' ], params: undefined, data: value }
				);

				expect( dataRequested ).not.toHaveBeenCalled();
				expect( dataReceived ).toHaveBeenCalledTimes( 1 );
				expect( dataReceived ).toHaveBeenCalledWith( dummyApi, '123', endpointPath, undefined, value );
				expect( errorReceived ).not.toHaveBeenCalled();
			} );
		} );

		it( 'should reject if value promise rejects.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			const errorReceived = jest.fn();
			const dummyApi = new FreshDataApi();
			dummyApi.setDataHandlers( dataRequested, dataReceived, errorReceived );
			const apiClient = new ApiClient( dummyApi, '123' );
			const endpointPath = [ 'things', '1' ];
			const message = 'I am misbehaving';
			const value = new Promise( ( resolve, reject ) => reject( { message } ) );

			const result = apiClient.waitForData( endpointPath, undefined, value, DEFAULT_FETCH_TIMEOUT );
			expect( result ).toBeInstanceOf( Promise );

			return result.then( ( resultValue ) => {
				expect( resultValue.endpointPath ).toEqual( endpointPath );
				expect( resultValue.params ).toBeUndefined();
				expect( resultValue.data ).toBeUndefined();
				expect( resultValue.error ).toBeInstanceOf( Object );
				expect( resultValue.error.message ).toEqual( message );
			} ).catch( ( error ) => {
				expect( error.endpointPath ).toEqual( endpointPath );
				expect( error.params ).toBeUndefined();
				expect( error.data ).toBeUndefined();
				expect( error.error ).toBeInstanceOf( Object );
				expect( error.error.message ).toEqual( message );

				expect( dataRequested ).not.toHaveBeenCalled();
				expect( dataReceived ).not.toHaveBeenCalled();
				expect( errorReceived ).toHaveBeenCalledTimes( 1 );
				expect( errorReceived ).toHaveBeenCalledWith( dummyApi, '123', endpointPath, undefined, { message } );
			} );
		} );

		it( 'should reject if timeout is reached.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			const errorReceived = jest.fn();
			const dummyApi = new FreshDataApi();
			dummyApi.setDataHandlers( dataRequested, dataReceived, errorReceived );
			const apiClient = new ApiClient( dummyApi, '123' );
			const endpointPath = [ 'things', '1' ];
			const value = new Promise( () => {} ); // This will intentionally never resolve.
			const message = 'Timeout of 10 reached.';

			const result = apiClient.waitForData( endpointPath, undefined, value, 10 );
			expect( result ).toBeInstanceOf( Promise );

			return result.then( ( resultValue ) => {
				expect( resultValue.endpointPath ).toEqual( endpointPath );
				expect( resultValue.params ).toBeUndefined();
				expect( resultValue.data ).toBeUndefined();
				expect( resultValue.error ).toBeInstanceOf( Object );
				expect( resultValue.error.message ).toEqual( message );
			} ).catch( ( error ) => {
				expect( error.endpointPath ).toEqual( endpointPath );
				expect( error.params ).toBeUndefined();
				expect( error.data ).toBeUndefined();
				expect( error.error ).toBeInstanceOf( Object );
				expect( error.error.message ).toEqual( message );

				expect( dataRequested ).not.toHaveBeenCalled();
				expect( dataReceived ).not.toHaveBeenCalled();
				expect( errorReceived ).toHaveBeenCalledTimes( 1 );
				expect( errorReceived ).toHaveBeenCalledWith( dummyApi, '123', endpointPath, undefined, { message } );
			} );
		} );
	} );

	describe( '#subscribe', () => {
		it( 'should add a callback to the subscription list.', () => {
			const dummyApi = new FreshDataApi();
			const apiClient = new ApiClient( dummyApi, '123' );
			const callback = jest.fn();

			expect( apiClient.subscriptionCallbacks.size ).toBe( 0 );

			apiClient.subscribe( callback );

			expect( apiClient.subscriptionCallbacks.size ).toBe( 1 );
			expect( apiClient.subscriptionCallbacks.has( callback ) ).toBeTruthy();
			expect( callback ).not.toHaveBeenCalled();
		} );

		it( 'should not add a callback multiple times.', () => {
			const dummyApi = new FreshDataApi();
			const apiClient = new ApiClient( dummyApi, '123' );
			const callback = jest.fn();

			expect( apiClient.subscribe( callback ) ).toBe( callback );
			expect( apiClient.subscribe( callback ) ).toBeFalsy();

			expect( apiClient.subscriptionCallbacks.size ).toBe( 1 );
			expect( apiClient.subscriptionCallbacks.has( callback ) ).toBeTruthy();
		} );

		it( 'should remove a callback to the subscription list.', () => {
			const dummyApi = new FreshDataApi();
			const apiClient = new ApiClient( dummyApi, '123' );
			const callback = jest.fn();

			apiClient.subscribe( callback );
			apiClient.unsubscribe( callback );

			expect( apiClient.subscriptionCallbacks.size ).toBe( 0 );
			expect( apiClient.subscriptionCallbacks.has( callback ) ).toBeFalsy();
		} );

		it( 'should not attempt remove a callback twice.', () => {
			const dummyApi = new FreshDataApi();
			const apiClient = new ApiClient( dummyApi, '123' );
			const callback = jest.fn();

			apiClient.subscribe( callback );
			expect( apiClient.unsubscribe( callback ) ).toBe( callback );
			expect( apiClient.unsubscribe( callback ) ).toBeFalsy();

			expect( apiClient.subscriptionCallbacks.size ).toBe( 0 );
		} );

		it( 'should call the callback whenever state is set on the client.', () => {
			const dummyApi = new FreshDataApi();
			const apiClient = new ApiClient( dummyApi, '123' );
			const callback = jest.fn();
			const state = {};

			apiClient.subscribe( callback );
			apiClient.setState( state );

			expect( callback ).toHaveBeenCalledTimes( 1 );
			expect( callback ).toHaveBeenCalledWith( apiClient );
		} );
	} );
} );
