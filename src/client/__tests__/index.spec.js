import FreshDataApi from '../../api';
import ApiClient from '../index';
import { SECOND } from '../../utils/constants';

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

		it( 'should trigger a requirements data update when component requirements change.', () => {
			apiClient.updateRequirementsData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 1 );

			apiClient.updateRequirementsData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 30 * SECOND }, 1 );
			} );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should not trigger a requirements data update when component requirements are still the same.', () => {
			apiClient.updateRequirementsData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 1 );

			apiClient.updateRequirementsData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should trigger a requirements data update when the client state is different.', () => {
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );

			const thing1new = { name: 'Thing 1 - new' };
			const thing1ClientState2 = {
				endpoints: {
					things: {
						endpoints: {
							1: {
								data: thing1new,
							},
						},
						queries: [
							{ params: { page: 1, perPage: 3 }, data: [ thing1new ] },
						],
					},
				},
			};

			apiClient.updateRequirementsData = jest.fn();
			apiClient.setState( thing1ClientState2 );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should not trigger a requirements data update when the client state is still the same.', () => {
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );

			apiClient.updateRequirementsData = jest.fn();
			apiClient.setState( thing1ClientState );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should fetch data when a new requirement is added for data that has never been fetched.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things', '3' ], undefined );
		} );

		it( 'should fetch data when a new requirement is added for data that is stale.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things', '1' ], undefined );
		} );

		it( 'should not fetch data when a new requirement is added for data that is fresh enough.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 95 * SECOND }, 1 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should fetch data when data for an existing requirement goes stale.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );

			apiClient.updateRequirementsData( now + ( 20 * SECOND ) );

			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things', '1' ], undefined );
		} );

		it( 'should fetch data for a query when a new requirement is added.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 10 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things' ], { page: 1, perPage: 10 } );
		} );

		it( 'should not fetch data for a query when a new requirement is already satisfied.', () => {
			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 3 );
			}, now );
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
			expect( apiClient.timeoutId ).toBeGreaterThan( 0 );
			apiClient.setComponentData( component, null );
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

			apiClient.fetchData( [ 'things', '1' ] );
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

			apiClient.fetchData( [ 'settings', 'currency' ] );
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

			expect( () => apiClient.fetchData( [ 'things', '1' ] ) ).toThrowError();
		} );

		it( 'should throw error if no endpoint is found.', () => {
			class TestApi extends FreshDataApi {
				static methods = {};
				static endpoints = {};
			}
			const api = new TestApi();
			const apiClient = new ApiClient( api, '123' );

			expect( () => apiClient.fetchData( [ 'things', '1' ] ) ).toThrowError();
		} );
	} );

	describe( '#setNextUpdate', () => {
		it( 'should set and clear timeoutId', () => {
			const apiClient = new ApiClient( emptyApi, '123' );
			expect( apiClient.timeoutId ).toBeNull();

			apiClient.setNextUpdate( 5000 );
			expect( apiClient.timeoutId ).toBeGreaterThan( 0 );

			apiClient.setNextUpdate( null );
			expect( apiClient.timeoutId ).toBeNull();
		} );
	} );
} );
