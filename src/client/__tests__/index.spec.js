import FreshDataApi from '../../api';
import ApiClient from '../index';
import { SECOND } from '../../utils/constants';
import { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from '../calculate-updates';

describe( 'ApiClient', () => {
	const now = new Date();

	const emptyApi = new FreshDataApi();

	const thingSelectors = {
		getThing: ( getData, requireData ) => ( requirement, id ) => {
			const resourceName = `thing:${ id }`;
			requireData( requirement, resourceName );
			return getData( resourceName );
		},
		getThingPage: ( getData, requireData ) => ( requirement, page, perPage ) => {
			const resourceName = `thing-page:{page:${ page },perPage:${ perPage }}`;
			requireData( requirement, resourceName );
			return getData( resourceName );
		},
	};

	const thing1 = { name: 'Thing 1' };
	const thing1ClientState = {
		resources: {
			'thing:1': {
				lastRequested: now - ( 99 * SECOND ),
				lastReceived: now - ( 92 * SECOND ),
				data: thing1,
			},
			'thing-page:{page:1,perPage:3}': {
				lastRequested: now - ( 80 * SECOND ),
				lastReceived: now - ( 81 * SECOND ),
				data: [ thing1 ]
			},
		},
	};

	it( 'should initialize to empty state', () => {
		const apiClient = new ApiClient( emptyApi, '123' );
		expect( apiClient.state ).toEqual( {} );
	} );

	it( 'should set state', () => {
		const clientState = { resources: {} };
		const apiClient = new ApiClient( emptyApi, '123' );
		apiClient.setState( clientState );
		expect( apiClient.state ).toBe( clientState );
	} );

	it( 'should update timer on set state', () => {
		const clientState = { resources: {} };
		const apiClient = new ApiClient( emptyApi, '123' );
		apiClient.updateTimer = jest.fn();
		apiClient.setState( clientState );
		expect( apiClient.updateTimer ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should not set state twice', () => {
		const clientState = { resources: {} };
		const apiClient = new ApiClient( emptyApi, '123' );
		apiClient.updateTimer = jest.fn();
		apiClient.setState( clientState );
		expect( apiClient.updateTimer ).toHaveBeenCalledTimes( 1 );

		apiClient.updateTimer = jest.fn();
		apiClient.setState( clientState );
		expect( apiClient.updateTimer ).not.toHaveBeenCalled();
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
		const apiClient = new ApiClient( api, '123' );

		const thingsPath = [ 'things' ];
		const pageParams = { page: 1, perPage: 3 };
		apiClient.methods.get( thingsPath )( pageParams );
		expect( checkMethod ).toHaveBeenCalledWith( 'get', '123', thingsPath, pageParams );

		const thing2Path = [ 'things', 2 ];
		apiClient.methods.post( thing2Path )();
		expect( checkMethod ).toHaveBeenCalledWith( 'post', '123', thing2Path, undefined );
	} );

	it( 'should map operations to methods', () => {
		const checkOperation = jest.fn();
		class TestApi extends FreshDataApi {
			static methods = { get: () => () => {} };
			static operations = {
				read: ( methods ) => ( resourceNames, data ) => {
					checkOperation( methods, resourceNames, data );
					return [];
				},
			}
		}
		const api = new TestApi();
		const apiClient = new ApiClient( api, '123' );

		apiClient.operations.read( [ 'thing:1' ], { color: 'red' } );
		expect( checkOperation ).toHaveBeenCalledWith( apiClient.methods, [ 'thing:1' ], { color: 'red' } );
	} );

	it( 'should map mutations to operations', () => {
		const createThing = jest.fn();
		const mappedCreateThing = jest.fn();
		createThing.mockReturnValue( mappedCreateThing );

		class TestApi extends FreshDataApi {
			static mutations = {
				createThing,
			}
		}

		const api = new TestApi();
		const apiClient = new ApiClient( api, '123' );

		expect( createThing ).toHaveBeenCalledTimes( 1 );
		expect( createThing ).toHaveBeenCalledWith( apiClient.operations );
		expect( apiClient.getMutations() ).toEqual( { createThing: mappedCreateThing } );
	} );

	it( 'should map getData to current state', () => {
		class TestApi extends FreshDataApi {
			static selectors = thingSelectors;
		}
		const api = new TestApi();
		const apiClient = new ApiClient( api, '123' );
		apiClient.setState( thing1ClientState );

		const dataThing1 = apiClient.getData( 'thing:1' );
		expect( dataThing1 ).toBe( thing1 );
	} );

	it( 'should start with no timeoutId', () => {
		const apiClient = new ApiClient( emptyApi, '123' );
		expect( apiClient.timeoutId ).toBeNull();
	} );

	describe( '#setComponentData', () => {
		class TestApi extends FreshDataApi {
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
				{ freshness: 60 * SECOND, resourceName: 'thing:1' },
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
					resourceName: 'thing:1',
				}
			] );
		} );

		it( 'should update timer', () => {
			apiClient.setState( thing1ClientState );

			apiClient.updateTimer = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );

			expect( apiClient.updateTimer ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should not set requirements if they have not changed', () => {
			apiClient.setState( thing1ClientState );

			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );

			apiClient.updateTimer = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			} );
			expect( apiClient.updateTimer ).not.toHaveBeenCalled();
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
			static resources = {
				read: [
					() => () => {},
				],
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
			expect( apiClient.updateRequirementsData ).not.toHaveBeenCalled();
		} );

		it( 'should read when a requirement is added for data that has never been read.', () => {
			apiClient.applyOperation = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.applyOperation ).toHaveBeenCalledWith( 'read', [ 'thing:3' ] );
		} );

		it( 'should handle an empty state.', () => {
			apiClient = new ApiClient( api, '123' );
			apiClient.applyOperation = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.applyOperation ).toHaveBeenCalledWith( 'read', [ 'thing:3' ] );
		} );

		it( 'should read when a new requirement is added for data that is stale.', () => {
			apiClient.applyOperation = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.applyOperation ).toHaveBeenCalledWith( 'read', [ 'thing:1' ] );
		} );

		it( 'should not read when a new requirement is added for data that is fresh enough.', () => {
			apiClient.applyOperation = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 95 * SECOND }, 1 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.applyOperation ).not.toHaveBeenCalled();
		} );

		it( 'should read when data for an existing requirement goes stale.', () => {
			apiClient.applyOperation = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 100 * SECOND }, 1 );
			}, now );

			apiClient.updateRequirementsData( now );
			expect( apiClient.applyOperation ).not.toHaveBeenCalled();

			const future = now.getTime() + ( 40 * SECOND );
			apiClient.updateRequirementsData( future );
			expect( apiClient.applyOperation ).toHaveBeenCalledWith( 'read', [ 'thing:1' ] );
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
	} );

	describe( '#applyOperation', () => {
		let api;
		let apiClient;

		beforeEach( () => {
			class TestApi extends FreshDataApi {
				static operations = {
					read: () => () => {
						const returnObject = {
							'type:1': { data: { attribute: 'some' } },
						};
						const returnPromise = new Promise( ( resolve ) => {
							resolve( {
								'thing:2': { data: { color: 'blue' } },
								'thing:3': { data: { color: 'green' } },
							} );
						} );
						return [ returnObject, returnPromise ];
					},
				}
			}
			api = new TestApi();
			apiClient = new ApiClient( api, '123' );
		} );

		it( 'should call the corresponding api operation handlers.', () => {
			const readFunc = jest.fn();
			class TestApi extends FreshDataApi {
				static operations = {
					read: ( methods ) => ( resourceNames, data ) => {
						readFunc( methods, resourceNames, data );
						return [];
					},
				}
			}
			api = new TestApi();
			apiClient = new ApiClient( api, '123' );

			apiClient.applyOperation( 'read', [ 'thing:1' ], { data: true } );
			expect( readFunc ).toHaveBeenCalledWith( api.methods, [ 'thing:1' ], { data: true } );
		} );

		it( 'should throw error if no read function is found.', () => {
			class TestApi extends FreshDataApi {
				static operations = {};
			}
			api = new TestApi();
			apiClient = new ApiClient( api, '123' );

			expect( () => apiClient.applyOperation( 'read', [ 'thing:1' ] ) ).toThrowError();
		} );

		it( 'should not crash if a resource is not handled.', () => {
			apiClient.applyOperation( 'read', [ 'thing:12' ], { data: true } );
		} );

		it( 'should call dataRequested for all resourceNames.', () => {
			const resourceNames = [ 'thing:1', 'thing:2', 'thing:3', 'type:1' ];
			const data = { data: true };
			const dataRequested = jest.fn();

			api.dataRequested = dataRequested;
			apiClient.applyOperation( 'read', resourceNames, data );
			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( '123', resourceNames );
		} );

		it( 'should call dataReceived for each resource received from either an object or promise.', () => {
			const resourceNames = [ 'thing:2', 'thing:3', 'type:1' ];
			const dataReceived = jest.fn();

			api.dataReceived = dataReceived;
			const requests = apiClient.applyOperation( 'read', resourceNames );

			Promise.all( requests ).then( () => {
				expect( dataReceived ).toHaveBeenCalledTimes( 2 );
				expect( dataReceived ).toHaveBeenCalledWith( '123', {
					'type:1': { data: { attribute: 'some' } },
				} );
				expect( dataReceived ).toHaveBeenCalledWith( '123', {
					'thing:2': { data: { color: 'blue' } },
					'thing:3': { data: { color: 'green' } },
				} );
			} );
		} );

		it( 'should call dataReceived for a promise that rejects.', () => {
			class TestApi extends FreshDataApi {
				static operations = {
					read: () => () => {
						const rejectPromise = new Promise( ( resolve, reject ) => {
							reject( {
								'thing:2': { error: { message: '😦' } },
								'thing:3': { error: { message: '😝' } },
							} );
						} );
						return [ rejectPromise ];
					},
				}
			}
			api = new TestApi();
			apiClient = new ApiClient( api, '123' );
			const resourceNames = [ 'thing:2', 'thing:3' ];
			const dataReceived = jest.fn();

			api.dataReceived = dataReceived;
			const requests = apiClient.applyOperation( 'read', resourceNames );

			Promise.all( requests ).then( () => {
				expect( dataReceived ).toHaveBeenCalledTimes( 1 );
				expect( dataReceived ).toHaveBeenCalledWith( '123', {
					'thing:2': { error: { message: '😦' } },
					'thing:3': { error: { message: '😝' } },
				} );
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
