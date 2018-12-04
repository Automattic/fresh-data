import ApiClient from '../index';
import { SECOND } from '../../utils/constants';
import { DEFAULT_MIN_UPDATE, DEFAULT_MAX_UPDATE } from '../calculate-updates';

describe( 'ApiClient', () => {
	const now = new Date();

	const emptyApiSpec = {};

	const thingSelectors = {
		getThing: ( getResource, requireResource ) => ( requirement, id ) => {
			const resourceName = `thing:${ id }`;
			requireResource( requirement, resourceName );
			return getResource( resourceName ).data;
		},
		getThingPage: ( getResource, requireResource ) => ( requirement, page, perPage ) => {
			const resourceName = `thing-page:{page:${ page },perPage:${ perPage }}`;
			requireResource( requirement, resourceName );
			return getResource( resourceName ).data;
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
		const apiClient = new ApiClient( emptyApiSpec );
		expect( apiClient.state ).toEqual( {} );
	} );

	it( 'should set state', () => {
		const clientState = { resources: {} };
		const apiClient = new ApiClient( emptyApiSpec );
		apiClient.setState( clientState );
		expect( apiClient.state ).toBe( clientState );
	} );

	it( 'should update timer on set state', () => {
		const clientState = { resources: {} };
		const apiClient = new ApiClient( emptyApiSpec );
		apiClient.updateTimer = jest.fn();
		apiClient.setState( clientState );
		expect( apiClient.updateTimer ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should not set state twice', () => {
		const clientState = { resources: {} };
		const apiClient = new ApiClient( emptyApiSpec );
		apiClient.updateTimer = jest.fn();
		apiClient.setState( clientState );
		expect( apiClient.updateTimer ).toHaveBeenCalledTimes( 1 );

		apiClient.updateTimer = jest.fn();
		apiClient.setState( clientState );
		expect( apiClient.updateTimer ).not.toHaveBeenCalled();
	} );

	it( 'should map mutations to operations', () => {
		const createThing = jest.fn();
		const mappedCreateThing = jest.fn();
		createThing.mockReturnValue( mappedCreateThing );

		const apiSpec = {
			mutations: {
				createThing,
			},
		};

		const apiClient = new ApiClient( apiSpec );

		expect( createThing ).toHaveBeenCalledTimes( 1 );
		expect( createThing ).toHaveBeenCalledWith( apiClient.operations );
		expect( apiClient.getMutations() ).toEqual( { createThing: mappedCreateThing } );
	} );

	it( 'should map getResource to current state', () => {
		const apiSpec = {
			selectors: thingSelectors,
		};
		const apiClient = new ApiClient( apiSpec );
		apiClient.setState( thing1ClientState );

		const dataThing1 = apiClient.getResource( 'thing:1' ).data;
		expect( dataThing1 ).toBe( thing1 );
	} );

	it( 'should start with no timeoutId', () => {
		const apiClient = new ApiClient( emptyApiSpec );
		expect( apiClient.timeoutId ).toBeNull();
	} );

	describe( '#getResource', () => {
		it( 'should return an empty object if the resource does not yet exist.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			expect( apiClient.getResource( 'nonexistentResource:1' ) ).toEqual( {} );
		} );

		it( 'should return resource state.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.setState( { resources: { 'thing:1': { lastRequested: now, data: { foot: 'red' } } } } );
			expect( apiClient.getResource( 'thing:1' ) ).toEqual( { lastRequested: now, data: { foot: 'red' } } );
		} );
	} );

	describe( '#requireResource', () => {
		it( 'should return an empty object if the resource does not yet exist.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			expect( apiClient.requireResource( [] )( {}, 'nonexistentResource:1' ) ).toEqual( {} );
		} );

		it( 'should return resource state just like getResource.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.setState( { resources: { 'thing:1': { lastRequested: now, data: { foot: 'red' } } } } );
			expect( apiClient.requireResource( [] )( {}, 'thing:1' ) ).toEqual( { lastRequested: now, data: { foot: 'red' } } );
		} );

		it( 'should add a requirement to a resource that does not yet exist.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const requirement = { freshness: 5 * SECOND };
			const componentRequirements = [];
			apiClient.requireResource( componentRequirements )( requirement, 'thing:1' );
			expect( componentRequirements ).toEqual( [ { freshness: 5 * SECOND, resourceName: 'thing:1' } ] );
		} );

		it( 'should add a duplicate requirement to a resource that already exists.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const requirement = { freshness: 5 * SECOND };
			const componentRequirements = [ { freshness: 2 * SECOND, resourceName: 'thing:1' } ];
			apiClient.requireResource( componentRequirements )( requirement, 'thing:1' );
			expect( componentRequirements ).toEqual( [
				{ freshness: 2 * SECOND, resourceName: 'thing:1' },
				{ freshness: 5 * SECOND, resourceName: 'thing:1' },
			] );
		} );
	} );

	describe( '#setComponentRequirements', () => {
		const apiSpec = {
			selectors: thingSelectors,
		};

		const component = () => {};
		const requirements = [];
		let apiClient = null;

		beforeEach( () => {
			apiClient = new ApiClient( apiSpec );
		} );

		afterEach( () => {
			apiClient.clearComponentRequirements( component );
		} );

		it( 'sets component requirements when none were set before', () => {
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( undefined );
			apiClient.setComponentRequirements( component, requirements );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( requirements );
		} );

		it( 'sets component requirements when some were set before', () => {
			const requirements2 = [];

			apiClient.setComponentRequirements( component, requirements );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( requirements );

			apiClient.setComponentRequirements( component, requirements2 );
			expect( apiClient.requirementsByComponent.get( component ) ).not.toBe( requirements );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( requirements2 );
		} );

		it( 'sets multiple component requirements', () => {
			const component2 = () => {};
			const requirements2 = [];

			apiClient.setComponentRequirements( component, requirements );
			apiClient.setComponentRequirements( component2, requirements2 );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( requirements );
			expect( apiClient.requirementsByComponent.get( component2 ) ).toBe( requirements2 );
		} );
	} );

	describe( '#clearComponentRequirements', () => {
		const apiSpec = {
			selectors: thingSelectors,
		};

		const component = () => {};
		const requirements = [];
		let apiClient = null;

		beforeEach( () => {
			apiClient = new ApiClient( apiSpec );
		} );

		it( 'clears component requirements', () => {
			apiClient.setComponentRequirements( component, requirements );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( requirements );

			apiClient.clearComponentRequirements( component );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( undefined );
		} );

		it( 'clears only the component given', () => {
			const component2 = () => {};
			const requirements2 = [];

			apiClient.setComponentRequirements( component, requirements );
			apiClient.setComponentRequirements( component2, requirements2 );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( requirements );
			expect( apiClient.requirementsByComponent.get( component2 ) ).toBe( requirements2 );

			apiClient.clearComponentRequirements( component );
			expect( apiClient.requirementsByComponent.get( component ) ).toBe( undefined );
			expect( apiClient.requirementsByComponent.get( component2 ) ).toBe( requirements2 );
		} );
	} );

	describe( '#setComponentData', () => {
		const apiSpec = {
			selectors: thingSelectors,
		};

		const component = () => {};
		let apiClient = null;

		beforeEach( () => {
			apiClient = new ApiClient( apiSpec );
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
			const apiClient = new ApiClient( emptyApiSpec, setTimer, clearTimer );
			apiClient.updateTimer( now, 5000 );

			expect( apiClient.timeoutId ).toBe( 5 );
			expect( setTimer ).toHaveBeenCalledTimes( 1 );
			expect( setTimer ).toHaveBeenCalledWith( apiClient.updateRequirementsData, 5000 );
			expect( clearTimer ).not.toHaveBeenCalled();
		} );

		it( 'should calculate nextUpdate when not given.', () => {
			const apiSpec = {
				selectors: thingSelectors,
			};
			const setTimer = jest.fn();
			setTimer.mockReturnValue( 5 ); // return a timeout id.
			const clearTimer = jest.fn();
			const apiClient = new ApiClient( apiSpec, setTimer, clearTimer );

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
			const apiClient = new ApiClient( emptyApiSpec, setTimer, clearTimer );

			apiClient.updateTimer( now );

			expect( apiClient.timeoutId ).toBe( 5 );
			expect( setTimer ).toHaveBeenCalledTimes( 1 );
			expect( setTimer ).toHaveBeenCalledWith( apiClient.updateRequirementsData, DEFAULT_MAX_UPDATE );
			expect( clearTimer ).not.toHaveBeenCalled();
		} );
	} );

	describe( '#updateRequirementsData', () => {
		const component = () => {};
		let apiSpec;
		let apiClient = null;

		beforeEach( () => {
			apiSpec = {
				selectors: thingSelectors,
				operations: {},
			};

			apiClient = new ApiClient( apiSpec );
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
			apiClient.operations.read = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.operations.read ).toHaveBeenCalledWith( [ 'thing:3' ] );
		} );

		it( 'should handle an empty state.', () => {
			apiClient.operations.read = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 3 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.operations.read ).toHaveBeenCalledWith( [ 'thing:3' ] );
		} );

		it( 'should throw an exception when the api read operation is not present.', async () => {
			apiClient.operations = {};
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );

			expect.assertions( 1 );
			try {
				await apiClient.updateRequirementsData( now );
			} catch ( e ) {
				expect( e ).toEqual( new Error( 'Operation "read" not found.' ) );
			}
		} );

		it( 'should read when a new requirement is added for data that is stale.', () => {
			apiClient.operations.read = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 90 * SECOND }, 1 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.operations.read ).toHaveBeenCalledWith( [ 'thing:1' ] );
		} );

		it( 'should not read when a new requirement is added for data that is fresh enough.', () => {
			apiClient.operations.read = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 95 * SECOND }, 1 );
			}, now );
			apiClient.updateRequirementsData( now );
			expect( apiClient.operations.read ).not.toHaveBeenCalled();
		} );

		it( 'should read when data for an existing requirement goes stale.', () => {
			apiClient.operations.read = jest.fn();
			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 100 * SECOND }, 1 );
			}, now );

			apiClient.updateRequirementsData( now );
			expect( apiClient.operations.read ).not.toHaveBeenCalled();

			const future = now.getTime() + ( 40 * SECOND );
			apiClient.updateRequirementsData( future );
			expect( apiClient.operations.read ).toHaveBeenCalledWith( [ 'thing:1' ] );
		} );

		it( 'should bubble up an error thrown from the read operation', async () => {
			const error = new Error( 'BOOM!' );
			apiSpec = {
				operations: {
					read: () => {
						throw error;
					},
				},
				selectors: thingSelectors,
			};
			apiClient = new ApiClient( apiSpec );

			apiClient.setComponentData( component, ( selectors ) => {
				selectors.getThing( { freshness: 100 * SECOND }, 1 );
			}, now );

			expect.assertions( 1 );
			try {
				return await apiClient.updateRequirementsData( now );
			} catch ( e ) {
				expect( e ).toBe( error );
			}
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
		let apiSpec;
		let apiClient;

		beforeEach( () => {
			apiSpec = {
				operations: {
					read: () => {
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
				},
			};
			apiClient = new ApiClient( apiSpec );
		} );

		it( 'should call the corresponding api operation handlers.', async () => {
			const readFunc = jest.fn();
			apiSpec = {
				operations: {
					read: ( resourceNames, resourceData ) => {
						readFunc( resourceNames, resourceData );
						return [];
					},
				},
			};
			apiClient = new ApiClient( apiSpec );

			await apiClient.applyOperation( apiSpec.operations.read, [ 'thing:1' ], { data: true } );
			expect( readFunc ).toHaveBeenCalledWith( [ 'thing:1' ], { data: true } );
		} );

		it( 'should not crash if the operation returns undefined', async () => {
			apiSpec = {
				operations: {
					read: () => {
						return undefined;
					},
				},
			};
			apiClient = new ApiClient( apiSpec );

			await apiClient.applyOperation( apiSpec.operations.read, [ 'thing:1' ] );
		} );

		it( 'should not crash if a resource is not handled.', async () => {
			await apiClient.applyOperation( apiSpec.operations.read, [ 'thing:12' ], { data: true } );
		} );

		it( 'should call dataRequested for all resourceNames.', async () => {
			const resourceNames = [ 'thing:1', 'thing:2', 'thing:3', 'type:1' ];
			const data = { data: true };

			apiClient.dataRequested = jest.fn();
			await apiClient.applyOperation( apiSpec.operations.read, resourceNames, data );
			expect( apiClient.dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.dataRequested ).toHaveBeenCalledWith( resourceNames );
		} );

		it( 'should call dataReceived for each resource received from either an object or promise.', async () => {
			const resourceNames = [ 'thing:2', 'thing:3', 'type:1' ];

			apiClient.dataReceived = jest.fn();
			await apiClient.applyOperation( apiSpec.operations.read, resourceNames );

			expect( apiClient.dataReceived ).toHaveBeenCalledTimes( 2 );
			expect( apiClient.dataReceived ).toHaveBeenCalledWith( {
				'type:1': { data: { attribute: 'some' } },
			} );
			expect( apiClient.dataReceived ).toHaveBeenCalledWith( {
				'thing:2': { data: { color: 'blue' } },
				'thing:3': { data: { color: 'green' } },
			} );
		} );
	} );

	describe( '#subscribe', () => {
		it( 'should add a callback to the subscription list.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const callback = jest.fn();

			expect( apiClient.subscriptionCallbacks.size ).toBe( 0 );

			apiClient.subscribe( callback );

			expect( apiClient.subscriptionCallbacks.size ).toBe( 1 );
			expect( apiClient.subscriptionCallbacks.has( callback ) ).toBeTruthy();
			expect( callback ).not.toHaveBeenCalled();
		} );

		it( 'should not add a callback multiple times.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const callback = jest.fn();

			expect( apiClient.subscribe( callback ) ).toBe( callback );
			expect( apiClient.subscribe( callback ) ).toBeFalsy();

			expect( apiClient.subscriptionCallbacks.size ).toBe( 1 );
			expect( apiClient.subscriptionCallbacks.has( callback ) ).toBeTruthy();
		} );

		it( 'should remove a callback to the subscription list.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const callback = jest.fn();

			apiClient.subscribe( callback );
			apiClient.unsubscribe( callback );

			expect( apiClient.subscriptionCallbacks.size ).toBe( 0 );
			expect( apiClient.subscriptionCallbacks.has( callback ) ).toBeFalsy();
		} );

		it( 'should not attempt remove a callback twice.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const callback = jest.fn();

			apiClient.subscribe( callback );
			expect( apiClient.unsubscribe( callback ) ).toBe( callback );
			expect( apiClient.unsubscribe( callback ) ).toBeFalsy();

			expect( apiClient.subscriptionCallbacks.size ).toBe( 0 );
		} );

		it( 'should call the callback whenever state is set on the client.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			const callback = jest.fn();
			const state = {};

			apiClient.subscribe( callback );
			apiClient.setState( state );

			expect( callback ).toHaveBeenCalledTimes( 1 );
			expect( callback ).toHaveBeenCalledWith( apiClient );
		} );
	} );

	describe( '#dataRequested', () => {
		it( 'should call dataHandlers.dataRequested', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();

			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.setDataHandlers( { dataRequested, dataReceived } );

			apiClient.dataRequested( [ 'one', 'two' ] );

			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( [ 'one', 'two' ] );
			expect( dataReceived ).not.toHaveBeenCalled();
		} );
	} );

	describe( '#dataReceived', () => {
		it( 'should call dataHandlers.dataReceived', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();

			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.setDataHandlers( { dataRequested, dataReceived } );

			apiClient.dataReceived( { one: 'red', two: 'blue' } );

			expect( dataReceived ).toHaveBeenCalledTimes( 1 );
			expect( dataReceived ).toHaveBeenCalledWith( { one: 'red', two: 'blue' } );
			expect( dataRequested ).not.toHaveBeenCalled();
		} );
	} );
} );
