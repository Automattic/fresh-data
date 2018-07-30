import { mount } from 'enzyme';
import React from 'react';
import PropTypes from 'prop-types';
import ApiClient from '../../client';
import FreshDataApi from '../../api';
import { ApiProvider, mapStateToProps } from '../provider';
import * as actions from '../actions';

describe( 'ApiProvider', () => {
	class TestApi extends FreshDataApi {
	}

	let api;

	beforeEach( () => {
		api = new TestApi();
	} );

	it( 'should render without crashing.', () => {
		mount(
			<ApiProvider
				api={ api }
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
					api={ api }
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
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);
			expect( wrapper.instance().getApiClient( '123' ) ).toBeInstanceOf( ApiClient );
		} );

		it( 'should return already created api client.', () => {
			const wrapper = mount(
				<ApiProvider
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);
			const apiClient = wrapper.instance().getApiClient( '123' );
			expect( wrapper.instance().getApiClient( '123' ) ).toBe( apiClient );
		} );

		it( 'should return undefined if no api prop is set.', () => {
			class ApiProviderOptionalPropTypes extends ApiProvider {
				static propTypes = {};
			}

			const wrapper = mount(
				<ApiProviderOptionalPropTypes
					api={ null }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProviderOptionalPropTypes>
			);
			expect( wrapper.instance().getApiClient( '123' ) ).toBeUndefined();
		} );
	} );

	describe( '#updateApis', () => {
		it( 'should set api data handlers initially.', () => {
			api.setDataHandlers = jest.fn();

			mount(
				<ApiProvider
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			expect( api.setDataHandlers ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should set api data handlers when the api prop is updated.', () => {
			const wrapper = mount(
				<ApiProvider
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			const newApi = new TestApi();
			newApi.setDataHandlers = jest.fn();
			wrapper.setProps( { api: newApi } );
			expect( newApi.setDataHandlers ).toHaveBeenCalledTimes( 1 );
		} );
	} );

	describe( '#updateState', () => {
		it( 'should update the states of the apis', () => {
			api.updateState = jest.fn();

			const now = new Date();
			const wrapper = mount(
				<ApiProvider
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			expect( api.updateState ).toHaveBeenCalledTimes( 1 );
			expect( api.updateState ).toHaveBeenCalledWith( {} );

			const expectedApiState = {
				123: {
					endpoints: {
						things: {
							endpoints: {
								1: {
									data: { testData: true },
									lastReceived: now,
								},
							},
						},
					},
				},
			};

			api.updateState = jest.fn();
			wrapper.setProps( { rootData: { 'test-api': expectedApiState, } } );

			expect( api.updateState ).toHaveBeenCalledTimes( 1 );
			expect( api.updateState ).toHaveBeenCalledWith( expectedApiState );
		} );
	} );

	describe( '#dataRequested', () => {
		it( 'should dispatch when called from an api.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();

			mount(
				<ApiProvider
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ dataRequested }
					dataReceived={ dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			api.dataRequested( '123', [ 'thing:1', 'thing:2' ] );
			expect( dataReceived ).not.toHaveBeenCalled();
			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( 'test-api', '123', [ 'thing:1', 'thing:2' ] );
		} );
	} );

	describe( '#dataReceived', () => {
		it( 'should dispatch when called from an api.', () => {
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();

			mount(
				<ApiProvider
					api={ api }
					apiName={ 'test-api' }
					rootData={ {} }
					dataRequested={ dataRequested }
					dataReceived={ dataReceived }
				>
					<span>Testing</span>
				</ApiProvider>
			);

			api.dataReceived( '123', {
				'thing:1': { data: { color: 'blue' } },
				'thing:2': { error: { message: 'oops!' } },
			} );
			expect( dataRequested ).not.toHaveBeenCalled();
			expect( dataReceived ).toHaveBeenCalledTimes( 1 );
			expect( dataReceived ).toHaveBeenCalledWith( 'test-api', '123', {
				'thing:1': { data: { color: 'blue' } },
				'thing:2': { error: { message: 'oops!' } },
			} );
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
