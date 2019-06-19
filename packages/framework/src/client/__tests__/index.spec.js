import { isString } from 'lodash';
import ApiClient from '../index';
import { SECOND } from '../../utils/constants';

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

	it( 'should map mutations to operations', () => {
		const write = jest.fn();
		const createThing = ( operations ) => () => {
			console.log( 'operations: ', operations );
			operations.write(
				[ 'resource1', 'resource2' ],
				{ resource1: { one: 1 }, resource2: { two: 2 } },
			);
		};

		const apiSpec = {
			operations: {
				write,
			},
			mutations: {
				createThing,
			},
		};

		const apiClient = new ApiClient( apiSpec );
		apiClient.scheduler.scheduleMutationOperation = jest.fn();

		apiClient.getMutations().createThing();

		expect( apiClient.scheduler.scheduleMutationOperation ).toHaveBeenCalledTimes( 1 );
		expect( apiClient.scheduler.scheduleMutationOperation ).toHaveBeenCalledWith(
			'write',
			[ 'resource1', 'resource2' ],
			{ resource1: { one: 1 }, resource2: { two: 2 } },
		);

		expect( write ).not.toHaveBeenCalled();
	} );

	it( 'should map selectors to getResource and requireResource', () => {
		const getThing = ( getResource, requireResource ) => ( thingName ) => {
			const resource1 = requireResource( { freshness: 30 * SECOND }, 'resource1', now );
			const resource2 = getResource( 'resource2' );
			return { resource1, resource2 };
		}

		const apiSpec = {
			selectors: {
				getThing,
			},
		};

		const apiClient = new ApiClient( apiSpec );
		apiClient.setState( {
			resources: {
				resource1: { data: { one: 1 } },
				resource2: { data: { two: 2 } },
			}
		} );
		apiClient.scheduler.scheduleRequest = jest.fn();

		expect( apiClient.getSelectors().getThing( 'thing' ) ).toEqual( {
			resource1: { data: { one: 1 } },
			resource2: { data: { two: 2 } }
		} );
		expect( apiClient.scheduler.scheduleRequest ).toHaveBeenCalledTimes( 1 );
		expect( apiClient.scheduler.scheduleRequest ).toHaveBeenCalledWith(
			{ freshness: 30 * SECOND },
			{ data: { one: 1 } },
			'resource1',
			'read',
			undefined,
			now,
		);
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

	describe( '#getName', () => {
		it ( 'should return the apiSpec name if avaialable', () => {
			const apiSpec = {
				name: 'apiname',
			}

			const apiClient = new ApiClient( apiSpec );

			expect( apiClient.getName() ).toBe( 'apiname' );
		} );

		it ( 'should create a unique name if no name given in apiSpec', () => {
			const apiClient1 = new ApiClient( {} );
			const apiClient2 = new ApiClient( {} );

			expect( isString( apiClient1.getName() ) ).toBeTruthy();
			expect( isString( apiClient2.getName() ) ).toBeTruthy();
			expect( apiClient1.getName() ).not.toEqual( apiClient2.getName() );
		} );
	} );

	describe( '#setDataHandlers', () => {
		it( 'should set the data handlers on the scheduler', () => {
			const apiClient = new ApiClient( {} );
			apiClient.scheduler.setDataHandlers = jest.fn();

			const dataRequested = () => {};
			const dataReceived = () => {};

			apiClient.setDataHandlers( { dataRequested, dataReceived } );

			expect( apiClient.scheduler.setDataHandlers ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.scheduler.setDataHandlers ).toHaveBeenCalledWith( dataRequested, dataReceived );
		} );
	} );

	describe( '#setState', () => {
		it( 'should set state', () => {
			const clientState = { resources: {} };
			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.setState( clientState );
			expect( apiClient.state ).toBe( clientState );
		} );

		it( 'should not set an identical state', () => {
			const clientState = { resources: {} };
			const apiClient = new ApiClient( emptyApiSpec );

			const callback = jest.fn();
			apiClient.subscribe( callback );

			apiClient.setState( clientState );
			apiClient.setState( clientState );
			expect( callback ).toHaveBeenCalledTimes( 1 );
			expect( callback ).toHaveBeenCalledWith( apiClient );
		} );
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
			expect( apiClient.requireResource( {}, 'nonexistentResource:1' ) ).toEqual( {} );
		} );

		it( 'should return resource state just like getResource.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.setState( { resources: { 'thing:1': { lastRequested: now, data: { foot: 'red' } } } } );
			expect( apiClient.requireResource( {}, 'thing:1' ) ).toEqual( { lastRequested: now, data: { foot: 'red' } } );
		} );

		it( 'should schedule a request for a resource that does not yet exist.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.scheduler.scheduleRequest = jest.fn();

			apiClient.requireResource( {}, 'thing:1', now );

			expect( apiClient.scheduler.scheduleRequest ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.scheduler.scheduleRequest ).toHaveBeenCalledWith( {}, {}, 'thing:1', 'read', undefined, now );
		} );

		it( 'should schedule a request for a resource that already exists.', () => {
			const apiClient = new ApiClient( emptyApiSpec );
			apiClient.scheduler.scheduleRequest = jest.fn();
			apiClient.state = { resources: { [ 'thing:1' ]: { lastReceived: 2 * SECOND } } };

			const requirement = { freshness: 5 * SECOND };

			apiClient.requireResource( requirement, 'thing:1', now );

			expect( apiClient.scheduler.scheduleRequest ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.scheduler.scheduleRequest ).toHaveBeenCalledWith( requirement, { lastReceived: 2 * SECOND }, 'thing:1', 'read', undefined, now );
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
} );
