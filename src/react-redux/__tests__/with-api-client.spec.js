import { mount } from 'enzyme';
import React from 'react';
import { startsWith } from 'lodash';
import withApiClient from '../with-api-client';
import ApiClient from '../../client';

describe( 'withApiClient', () => {
	let apiSpec;
	let apiClient;
	let Component;
	let mapSelectorsToProps;
	let mapMutationsToProps;
	let getApiClient;

	beforeEach( () => {
		apiSpec = {
			selectors: {
				getThing: () => () => {
					return { id: 1, color: 'red' };
				},
			},
		};

		apiClient = new ApiClient( apiSpec );

		Component = () => {
			return (
				<span className="test-span">Testing</span>
			);
		};

		mapSelectorsToProps = () => ( {} );

		getApiClient = () => {
			return apiClient;
		};
	} );

	it( 'should render wrapped component.', () => {
		const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
		const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );
		expect( wrapper.find( '.test-span' ) ).toHaveLength( 1 );
	} );

	it( 'should set displayName for wrapped component with displayName.', () => {
		Component.displayName = 'TestDisplayName';
		const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
		expect( ComponentWithApiClient.displayName ).toBe( 'ApiClientConnect( TestDisplayName )' );
	} );

	it( 'should set displayName for wrapped component without displayName.', () => {
		Component.displayName = null;
		const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
		expect( ComponentWithApiClient.displayName ).toBe( 'ApiClientConnect( ' + Component.name + ' )' );
	} );

	it( 'should render wrapped component even without getApiClient in context.', () => {
		const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
		const wrapper = mount( <ComponentWithApiClient /> );
		expect( wrapper.find( '.test-span' ) ).toHaveLength( 1 );
	} );

	it( 'should return null if wrapped component is not valid.', () => {
		const result = withApiClient( { mapSelectorsToProps } )( '' );
		expect( result ).toBeNull();
	} );

	describe( '#updateClient', () => {
		it( 'should call getApiClient on mount.', () => {
			const mockGetApiClient = jest.fn();
			mockGetApiClient.mockReturnValue( getApiClient() );
			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			mount(
				<ComponentWithApiClient />,
				{ context: { getApiClient: mockGetApiClient } }
			);

			expect( mockGetApiClient ).toHaveBeenCalled();
		} );

		it( 'should set client in state.', () => {
			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );

			wrapper.instance().updateClient( {}, {} );

			const state = wrapper.instance().state;
			expect( state.client ).toBe( getApiClient() );
		} );

		it( 'should subscribe to the ApiClient on mount.', () => {
			apiClient.subscribe = jest.fn();

			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );
			const handleSubscriptionChange = wrapper.instance().handleSubscriptionChange;
			const state = wrapper.instance().state;

			expect( apiClient.subscribe ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.subscribe ).toHaveBeenCalledWith( handleSubscriptionChange );
			expect( state.client ).toBe( apiClient );
		} );

		it( 'should unsubscribe from the ApiClient on unmount.', () => {
			apiClient.unsubscribe = jest.fn();

			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );

			const handleSubscriptionChange = wrapper.instance().handleSubscriptionChange;
			wrapper.unmount();

			expect( apiClient.unsubscribe ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.unsubscribe ).toHaveBeenCalledWith( handleSubscriptionChange );
		} );

		it( 'should unsubscribe from the ApiClient if a different api is set.', () => {
			const apiClient1 = new ApiClient( apiSpec );
			const apiClient2 = new ApiClient( apiSpec );

			apiClient1.unsubscribe = jest.fn();
			apiClient2.unsubscribe = jest.fn();

			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient: () => ( apiClient1 ) } } );
			const handleSubscriptionChange = wrapper.instance().handleSubscriptionChange;

			wrapper.setContext( { getApiClient: () => ( apiClient2 ) } );

			expect( apiClient1.unsubscribe ).toHaveBeenCalledTimes( 1 );
			expect( apiClient1.unsubscribe ).toHaveBeenCalledWith( handleSubscriptionChange );
			expect( apiClient2.unsubscribe ).not.toHaveBeenCalled();
		} );
	} );

	describe( '#handleSubscriptionChange', () => {
		it( 'should update when ApiClient state changes.', () => {
			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );

			const clientState = {
				resources: {},
			};
			apiClient.setState( clientState );

			expect( wrapper.instance().state.clientState ).toBe( clientState );
		} );

		it( 'should not update when ApiClient state is identical.', () => {
			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );

			const clientState = {
				resources: {},
			};
			apiClient.setState( clientState );

			wrapper.instance().setState = jest.fn();
			apiClient.setState( clientState );

			expect( wrapper.instance().setState ).not.toHaveBeenCalled();
		} );
	} );

	describe( '#mapSelectorsToProps', () => {
		it( 'should call mapSelectorsToProps if present.', () => {
			mapSelectorsToProps = jest.fn();

			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			mount( <ComponentWithApiClient />, { context: { getApiClient } } );

			expect( mapSelectorsToProps ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should provide api selectors to mapSelectorsToProps', () => {
			const thing = { id: 1, color: 'red' };
			let expectedProps = { testProp: 'testValue' };

			mapSelectorsToProps = ( selectors, ownProps ) => {
				const { getThing } = selectors;
				expect( getThing ).toBeInstanceOf( Function );
				expect( ownProps ).toEqual( expectedProps );

				const selectorProps = { thing };
				expectedProps = { ...ownProps, ...selectorProps };
				return selectorProps;
			};

			Component = ( props ) => {
				expect( props ).toEqual( expectedProps );
				return <span className="test-span">Testing</span>;
			};

			const ComponentWithApiClient = withApiClient( { mapSelectorsToProps } )( Component );
			mount( <ComponentWithApiClient testProp="testValue" />, { context: { getApiClient } } );
		} );
	} );

	describe( '#mapMutationsToProps', () => {
		it( 'should call mapMutationsToProps if present.', () => {
			mapMutationsToProps = jest.fn();

			const ComponentWithApiClient = withApiClient( { mapMutationsToProps } )( Component );
			mount( <ComponentWithApiClient />, { context: { getApiClient } } );

			expect( mapMutationsToProps ).toHaveBeenCalledTimes( 1 );
		} );

		// TODO: This test runs code a bit deep, split it up into an ApiClient test and this one.
		it( 'should provide working mutation functions to derived props.', () => {
			const putFunc = jest.fn();
			const updateFunc = jest.fn();

			apiSpec = {
				methods: {
					put: ( path, data ) => {
						putFunc( path, data );
					},
				},
				operations: {
					update: ( { put } ) => ( resourceNames, resourceData ) => {
						const filteredNames = resourceNames.filter( name => startsWith( name, 'thing:' ) );
						return filteredNames.reduce( ( requests, name ) => {
							const id = name.substr( name.indexOf( ':' ) + 1 );
							const data = resourceData[ name ];
							requests[ name ] = put( [ 'things', id ], { data } );
							return requests;
						}, {} );
					},
				},
				mutations: {
					updateThing: ( operations ) => ( id, data ) => {
						updateFunc( id, data );
						const resourceName = `thing:${ id }`;
						operations.update( [ resourceName ], { [ resourceName ]: data } );
					},
				},
			};
			apiClient = new ApiClient( apiSpec );

			let expectedProps = { testProp: 'testValue' };
			let mutationProps = null;

			mapMutationsToProps = ( mutations, ownProps ) => {
				const { updateThing } = mutations;
				expect( updateThing ).toBeInstanceOf( Function );
				expect( ownProps ).toEqual( expectedProps );

				mutationProps = { updateThing };
				expectedProps = { ...ownProps, ...mutationProps };
				return mutationProps;
			};

			Component = ( props ) => {
				expect( props ).toEqual( expectedProps );
				return <span className="test-span">Testing</span>;
			};

			const ComponentWithApiClient = withApiClient( { mapMutationsToProps } )( Component );
			mount( <ComponentWithApiClient testProp="testValue" />, { context: { getApiClient } } );

			expect( updateFunc ).not.toHaveBeenCalled();

			mutationProps.updateThing( 1, { id: 1, color: 'red' } );
			expect( updateFunc ).toHaveBeenCalledTimes( 1 );
			expect( updateFunc ).toHaveBeenCalledWith( 1, { id: 1, color: 'red' } );
			expect( putFunc ).toHaveBeenCalledTimes( 1 );
			expect( putFunc ).toHaveBeenCalledWith( [ 'things', '1' ], { data: { id: 1, color: 'red' } } );
		} );
	} );

	it( 'should render without options.', () => {
		const ComponentWithApiClient = withApiClient( {} )( Component );

		const doRender = () => {
			mount( <ComponentWithApiClient />, { context: { getApiClient } } );
		};

		expect( doRender ).not.toThrow();
	} );
} );
