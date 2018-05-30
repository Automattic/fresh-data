import { mount } from 'enzyme';
import React from 'react';
import FreshDataApi from '../../api';
import withApiClient from '../with-api-client';

describe( 'withApiClient', () => {
	class TestApi extends FreshDataApi {
	}

	const api = new TestApi();

	const Component = () => {
		return (
			<span className="test-span">Testing</span>
		);
	};
	const mapApiToProps = () => ( {} );
	const getClientKey = () => '123';

	const getApiClient = ( apiName, clientKey ) => {
		if ( 'test' === apiName ) {
			return api.getClient( clientKey );
		}
	};

	it( 'should render wrapped component.', () => {
		const ComponentWithApiClient = withApiClient( 'test', mapApiToProps, getClientKey )( Component );
		const wrapper = mount( <ComponentWithApiClient />, { context: { getApiClient } } );
		expect( wrapper.find( '.test-span' ) ).toHaveLength( 1 );
	} );

	it( 'should render wrapped component even without getApiClient in context.', () => {
		const ComponentWithApiClient = withApiClient( 'test', mapApiToProps, getClientKey )( Component );
		const wrapper = mount( <ComponentWithApiClient /> );
		expect( wrapper.find( '.test-span' ) ).toHaveLength( 1 );
	} );

	it( 'should call getApiClient on mount.', () => {
		const mockGetApiClient = jest.fn();
		mockGetApiClient.mockReturnValue( getApiClient( 'test', '123' ) );
		const ComponentWithApiClient = withApiClient( 'test', mapApiToProps, getClientKey )( Component );
		mount( <ComponentWithApiClient />, { context: { getApiClient: mockGetApiClient } } );

		expect( mockGetApiClient ).toHaveBeenCalledTimes( 1 );
		expect( mockGetApiClient ).toHaveBeenCalledWith( 'test', '123' );
	} );

	describe( '#subscribe', () => {
	} );

	describe( '#unsubscribe', () => {
	} );

	describe( '#handleSubscriptionChange', () => {
	} );

	describe( '#mapApiToProps', () => {
		it( 'should provide api selectors to mapApiToProps', () => {
		} );
	} );
} );
