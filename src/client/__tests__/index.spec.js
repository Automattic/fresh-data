import ApiClient from '../index';
import { SECOND } from '../../utils/constants';

describe( 'ApiClient', () => {
	const now = new Date();

	const emptyApi = {
		methods: {},
		endpoints: {
		},
		selectors: {},
	};

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
		const api = {
			methods: {
				get: ( clientKey ) => ( endpointPath ) => ( params ) => {
					checkMethod( 'get', clientKey, endpointPath, params );
				},
				post: ( clientKey ) => ( endpointPath ) => ( params ) => {
					checkMethod( 'post', clientKey, endpointPath, params );
				},
			},
		};
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
		const api = {
			methods: {},
			endpoints: {},
			selectors: thingSelectors,
		};
		const apiClient = new ApiClient( api, '123' );
		apiClient.setState( thing1ClientState );

		const dataThing1 = apiClient.getData( [ 'things', 1 ] );
		expect( dataThing1 ).toBe( thing1 );

		const queryData = apiClient.getData( [ 'things' ], { page: 1, perPage: 3 } );
		expect( queryData ).toHaveLength( 1 );
		expect( queryData[ 0 ] ).toBe( thing1 );
	} );

	describe( '#setComponentData', () => {
		const api = {
			methods: {},
			endpoints: {
				things: {
					read: () => {},
				},
			},
			selectors: thingSelectors,
		};

		const component = () => {};

		it( 'should select data for component from last state set', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.setComponentData( component, ( selectors ) => {
				expect( selectors.getThing( {}, 1 ) ).toBe( thing1 );
			} );
		} );

		it( 'should set requirements for component', () => {
			const apiClient = new ApiClient( api, '123' );
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
		const api = {
			methods: {},
			endpoints: {
				things: {
					read: () => {},
				},
			},
			selectors: thingSelectors,
		};

		const component = () => {};

		it( 'should trigger a requirements data update when component requirements change.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

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
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

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
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );
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
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );

			apiClient.updateRequirementsData = jest.fn();
			apiClient.setState( thing1ClientState );
			expect( apiClient.updateRequirementsData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should fetch data when a new requirement is added for data that has never been fetched.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things', '3' ], undefined );
		} );

		it( 'should fetch data when a new requirement is added for data that is stale.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things', '1' ], undefined );
		} );

		it( 'should not fetch data when a new requirement is added for data that is fresh enough.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 95 * SECOND }, 1 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should fetch data when data for an existing requirement goes stale.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );

			apiClient.updateRequirementsData( now + ( 20 * SECOND ) );

			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things', '1' ], undefined );
		} );

		it( 'should fetch data for a query when a new requirement is added.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 10 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledWith( [ 'things' ], { page: 1, perPage: 10 } );
		} );

		it( 'should not fetch data for a query when a new requirement is already satisfied.', () => {
			const apiClient = new ApiClient( api, '123' );
			apiClient.setState( thing1ClientState );

			apiClient.fetchData = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThingPage( { freshness: 90 * SECOND }, 1, 3 );
			}, now );
			expect( apiClient.fetchData ).toHaveBeenCalledTimes( 0 );
		} );
	} );

	describe( '#fetchData', () => {
		it( 'should call the corresponding api endpoint read function.', () => {
			const readFunc = jest.fn();
			const dummyApi = {
				methods: {},
				endpoints: {
					things: {
						read: readFunc,
					},
				},
			};
			const apiClient = new ApiClient( dummyApi, '123' );

			apiClient.fetchData( [ 'things', '1' ] );
			expect( readFunc ).toHaveBeenCalledWith( dummyApi.methods, [ '1' ], undefined );
		} );

		it( 'should call a nested api endpoint if it exists.', () => {
			const settingsReadFunc = jest.fn();
			const currencyReadFunc = jest.fn();
			const dummyApi = {
				methods: {},
				endpoints: {
					settings: {
						read: settingsReadFunc,
						currency: {
							read: currencyReadFunc,
						},
					},
				},
			};
			const apiClient = new ApiClient( dummyApi, '123' );

			apiClient.fetchData( [ 'settings', 'currency' ] );
			expect( currencyReadFunc ).toHaveBeenCalledWith( dummyApi.methods, [], undefined );
			expect( settingsReadFunc ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'should throw error if no read function is found.', () => {
			const dummyApi = {
				methods: {},
				endpoints: {
					things: {},
				},
			};
			const apiClient = new ApiClient( dummyApi, '123' );

			expect( () => apiClient.fetchData( [ 'things', '1' ] ) ).toThrowError();
		} );

		it( 'should throw error if no endpoint is found.', () => {
			const dummyApi = {
				methods: {},
				endpoints: {},
			};
			const apiClient = new ApiClient( dummyApi, '123' );

			expect( () => apiClient.fetchData( [ 'things', '1' ] ) ).toThrowError();
		} );
	} );
} );
