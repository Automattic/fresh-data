import { mount } from 'enzyme';
import React from 'react';
import PropTypes from 'prop-types';
import { ApiClient } from '@fresh-data/framework';
import { ApiProvider, mapStateToProps } from '../provider';
import * as actions from '../actions';

describe( 'ApiProvider', () => {
	let apiSpec;

	beforeEach( () => {
		apiSpec = {};
	} );

	it( 'should render without crashing.', () => {
		mount(
			<ApiProvider
				apiSpec={ apiSpec }
				apiName={ 'test-api' }
				rootData={ {} }
				dataRequested={ actions.dataRequested }
				dataReceived={ actions.dataReceived }
			>
				<span>Testing</span>
			</ApiProvider>
		);
	} );

	describe( '#getApiClient', () => {
		it( 'should pass down getApiClient to children via context.', () => {
			let childContext = null;

			const ChildComponent = ( props, context ) => {
				childContext = context;
				return (
					<span>Child Test</span>
				);
			};
			ChildComponent.contextTypes = { getApiClient: PropTypes.func };

			const wrapper = mount(
				<ApiProvider
					apiSpec={ apiSpec }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<ChildComponent />
				</ApiProvider>
			);

			expect( childContext ).toBeInstanceOf( Object );
			expect( childContext.getApiClient ).toBe( wrapper.instance().getApiClient );
		} );

		it( 'should return newly created api client.', () => {
			const wrapper = mount(
				<ApiProvider
					apiSpec={ apiSpec }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);
			expect( wrapper.instance().getApiClient() ).toBeInstanceOf( ApiClient );
		} );

		it( 'should return already created api client.', () => {
			const wrapper = mount(
				<ApiProvider
					apiSpec={ apiSpec }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);
			const apiClient = wrapper.instance().getApiClient();
			expect( wrapper.instance().getApiClient() ).toBe( apiClient );
		} );

		it( 'should return null if no apiSpec prop is set.', () => {
			class ApiProviderOptionalPropTypes extends ApiProvider {
				static propTypes = {};
			}

			const wrapper = mount(
				<ApiProviderOptionalPropTypes
					apiSpec={ null }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProviderOptionalPropTypes>
			);
			expect( wrapper.instance().getApiClient() ).toBeNull();
		} );
	} );

	describe( '#update', () => {
		it( 'should set api data handlers initially.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();

			const wrapper = mount(
				<ApiProvider
					apiSpec={ apiSpec }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ dataRequested }
					dataReceived={ dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);
			const provider = wrapper.instance();

			expect( provider.apiClient.dataHandlers.dataRequested ).toBe( provider.dataRequested );
			expect( provider.apiClient.dataHandlers.dataReceived ).toBe( provider.dataReceived );

			provider.dataRequested( [ 'one', 'two' ] );

			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( 'test-api', [ 'one', 'two' ] );

			provider.dataReceived( { one: 'red', two: 'blue' } );

			expect( dataReceived ).toHaveBeenCalledTimes( 1 );
			expect( dataReceived ).toHaveBeenCalledWith( 'test-api', { one: 'red', two: 'blue' } );
		} );

		it( 'should create a new client when apiSpec changes', () => {
			const wrapper = mount(
				<ApiProvider
					apiSpec={ apiSpec }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			const client1 = wrapper.instance().apiClient;

			const apiSpec2 = {};
			wrapper.setProps( { apiSpec: apiSpec2 } );

			const client2 = wrapper.instance().apiClient;

			expect( client1 ).toBeInstanceOf( ApiClient );
			expect( client2 ).toBeInstanceOf( ApiClient );
			expect( client1 ).not.toBe( client2 );
		} );

		it( 'should update the states of the apiClient', () => {
			const state1 = { 'test-api': { key: 'value1' } };
			const state2 = { 'test-api': { key: 'value2' } };

			const wrapper = mount(
				<ApiProvider
					apiSpec={ apiSpec }
					apiName={ 'test-api' }
					rootData={ state1 }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			const { apiClient } = wrapper.instance();

			expect( apiClient.state ).toBe( state1[ 'test-api' ] );

			wrapper.setProps( { rootData: state2 } );
			expect( apiClient.state ).toBe( state2[ 'test-api' ] );
		} );
	} );

	describe( '#mapStateToProps', () => {
		const ownProps = { rootPath: 'freshData' };

		it( 'should map rootData based on rootPath', () => {
			const myState = { freshDataState: true };
			const state = {
				freshData: myState,
			};

			const derivedProps = mapStateToProps( state, ownProps );
			expect( derivedProps.rootData ).toBe( myState );
		} );

		it( 'should default to empty object', () => {
			const state = {};

			const derivedProps = mapStateToProps( state, ownProps );
			expect( derivedProps.rootData ).toEqual( {} );
		} );
	} );
} );
