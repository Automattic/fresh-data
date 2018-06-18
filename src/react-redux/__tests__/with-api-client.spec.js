import { mount } from 'enzyme';
import React from 'react';
import FreshDataApi from '../../api';
import withApiClient from '../with-api-client';

describe( 'withApiClient', () => {
	class TestApi extends FreshDataApi {
		static selectors = {
			getThing: () => () => {
				return { id: 1, color: 'red' };
			},
		};
	}

	let api;
	let Component;
	let mapSelectorsToProps;
	let getClientKey;
	let getApiClient;

	beforeEach( () => {
		api = new TestApi();

		Component = () => {
			return (
				<span className="test-span">Testing</span>
			);
		};

		mapSelectorsToProps = () => ( {} );
		getClientKey = ( { clientKey } ) => clientKey;

		getApiClient = ( apiName, clientKey ) => {
			if ( 'test' === apiName ) {
				return api.getClient( clientKey );
			}
		};
	} );

	it( 'should render wrapped component.', () => {
		const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
		const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );
		expect( wrapper.find( '.test-span' ) ).toHaveLength( 1 );
	} );

	it( 'should set displayName for wrapped component with displayName.', () => {
		Component.displayName = 'TestDisplayName';
		const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
		expect( ComponentWithApiClient.displayName ).toBe( 'ApiClientConnect( TestDisplayName )' );
	} );

	it( 'should set displayName for wrapped component without displayName.', () => {
		Component.displayName = null;
		const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
		expect( ComponentWithApiClient.displayName ).toBe( 'ApiClientConnect( ' + Component.name + ' )' );
	} );

	it( 'should render wrapped component even without getApiClient in context.', () => {
		const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
		const wrapper = mount( <ComponentWithApiClient clientKey="123" /> );
		expect( wrapper.find( '.test-span' ) ).toHaveLength( 1 );
	} );

	it( 'should return null if wrapped component is not valid.', () => {
		const result = withApiClient( 'test', mapSelectorsToProps, getClientKey )( '' );
		expect( result ).toBeNull();
	} );

	describe( '#updateClient', () => {
		it( 'should call getClientKey with given props.', () => {
			getClientKey = jest.fn();
			getClientKey.mockReturnValue( '123' );

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );

			expect( getClientKey ).toHaveBeenLastCalledWith( { clientKey: '123' } );
		} );

		it( 'should call getApiClient on mount.', () => {
			const mockGetApiClient = jest.fn();
			mockGetApiClient.mockReturnValue( getApiClient( 'test', '123' ) );
			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			mount(
				<ComponentWithApiClient clientKey="123" />,
				{ context: { getApiClient: mockGetApiClient } }
			);

			expect( mockGetApiClient ).toHaveBeenCalledTimes( 1 );
			expect( mockGetApiClient ).toHaveBeenCalledWith( 'test', '123' );
		} );

		it( 'should call getApiClient on update.', () => {
			const mockGetApiClient = jest.fn();
			mockGetApiClient.mockReturnValueOnce( getApiClient( 'test', '123' ) );
			mockGetApiClient.mockReturnValueOnce( getApiClient( 'test', '456' ) );
			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount(
				<ComponentWithApiClient clientKey="123" />,
				{ context: { getApiClient: mockGetApiClient } }
			);

			expect( mockGetApiClient ).toHaveBeenCalledTimes( 1 );
			expect( mockGetApiClient ).toHaveBeenLastCalledWith( 'test', '123' );

			wrapper.setProps( { clientKey: '456' } );

			expect( mockGetApiClient ).toHaveBeenCalledTimes( 2 );
			expect( mockGetApiClient ).toHaveBeenLastCalledWith( 'test', '456' );
		} );

		it( 'should set clientKey and client in state.', () => {
			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );

			wrapper.instance().updateClient( {}, {} );

			const state = wrapper.instance().state;
			expect( state.clientKey ).toBe( '123' );
			expect( state.client ).toBe( getApiClient( 'test', '123' ) );
		} );

		it( 'should subscribe to the ApiClient on mount.', () => {
			const apiClient = getApiClient( 'test', '123' );
			apiClient.subscribe = jest.fn();

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );
			const handleSubscriptionChange = wrapper.instance().handleSubscriptionChange;
			const state = wrapper.instance().state;

			expect( apiClient.subscribe ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.subscribe ).toHaveBeenCalledWith( handleSubscriptionChange );
			expect( state.clientKey ).toBe( '123' );
			expect( state.client ).toBe( apiClient );
		} );

		it( 'should unsubscribe from the ApiClient on unmount.', () => {
			const apiClient = getApiClient( 'test', '123' );
			apiClient.unsubscribe = jest.fn();

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );

			const handleSubscriptionChange = wrapper.instance().handleSubscriptionChange;
			wrapper.unmount();

			expect( apiClient.unsubscribe ).toHaveBeenCalledTimes( 1 );
			expect( apiClient.unsubscribe ).toHaveBeenCalledWith( handleSubscriptionChange );
		} );
	} );

	describe( '#handleSubscriptionChange', () => {
		it( 'should update when ApiClient state changes.', () => {
			const apiClient = getApiClient( 'test', '123' );

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );

			const clientState = {
				123: { endpoints: {}, },
			};
			apiClient.setState( clientState );

			expect( wrapper.instance().state.clientState ).toBe( clientState );
		} );

		it( 'should not update when ApiClient state is identical.', () => {
			const apiClient = getApiClient( 'test', '123' );

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );

			const clientState = {
				123: { endpoints: {}, },
			};
			apiClient.setState( clientState );

			wrapper.instance().setState = jest.fn();
			apiClient.setState( clientState );

			expect( wrapper.instance().setState ).not.toHaveBeenCalled();
		} );

		it( 'should not update when set with wrong ApiClient.', () => {
			const apiClient1 = getApiClient( 'test', '123' );
			const apiClient2 = getApiClient( 'test', '456' );

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			const wrapper = mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );
			expect( wrapper.instance().state.clientState ).toBe( apiClient1.state );

			apiClient1.unsubscribe = jest.fn(); // subvert the unsubscribe.
			wrapper.setProps( { clientKey: '456' } );
			expect( apiClient1.unsubscribe ).toHaveBeenCalled();
			expect( wrapper.instance().state.clientState ).toBe( apiClient2.state );

			const clientState = {
				123: { endpoints: {}, },
			};
			apiClient1.setState( clientState );

			expect( wrapper.instance().state.clientState ).toBe( apiClient2.state );
		} );
	} );

	describe( '#mapSelectorsToProps', () => {
		it( 'should provide api selectors to mapSelectorsToProps', () => {
			const thing = { id: 1, color: 'red' };
			let expectedProps = { clientKey: '123' };

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

			const ComponentWithApiClient = withApiClient( 'test', mapSelectorsToProps, getClientKey )( Component );
			mount( <ComponentWithApiClient clientKey="123" />, { context: { getApiClient } } );
		} );
	} );
} );
