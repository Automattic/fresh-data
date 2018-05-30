import { mount } from 'enzyme';
import React from 'react';
import PropTypes from 'prop-types';
import ApiClient from '../../client';
import FreshDataApi from '../../api';
import { FreshDataReduxProvider } from '../provider';
import * as actions from '../actions';

describe( 'FreshDataReduxProvider', () => {
	class TestApi extends FreshDataApi {
	}

	let apis;

	beforeEach( () => {
		apis = { test: new TestApi() };
	} );

	it( 'should render without crashing.', () => {
		mount(
			<FreshDataReduxProvider
				apis={ apis }
				rootData={ {} }
				dataRequested={ actions.dataRequested }
				dataReceived={ actions.dataReceived }
				errorReceived={ actions.errorReceived }
			>
				<span>Testing</span>
			</FreshDataReduxProvider>
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
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<ChildComponent />
				</FreshDataReduxProvider>
			);

			expect( childContext ).toBeInstanceOf( Object );
			expect( childContext.getApiClient ).toBe( wrapper.instance().getApiClient );
		} );

		it( 'should return newly created api client.', () => {
			const wrapper = mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);
			expect( wrapper.instance().getApiClient( 'test', '123' ) ).toBeInstanceOf( ApiClient );
		} );

		it( 'should return already created api client.', () => {
			const wrapper = mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);
			const apiClient = wrapper.instance().getApiClient( 'test', '123' );
			expect( wrapper.instance().getApiClient( 'test', '123' ) ).toBe( apiClient );
		} );

		it( 'should return null if incorrect api name is given.', () => {
			const wrapper = mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);
			expect( wrapper.instance().getApiClient( 'tst', '123' ) ).toBeNull();
		} );
	} );

	describe( '#updateApis', () => {
		it( 'should set api data handlers initially.', () => {
			apis.test.setDataHandlers = jest.fn();

			mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);

			expect( apis.test.setDataHandlers ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should set api data handlers when the apis prop is updated.', () => {
			const wrapper = mount(
				<FreshDataReduxProvider
					apis={ {} }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);

			apis.test.setDataHandlers = jest.fn();
			wrapper.setProps( { apis } );
			expect( apis.test.setDataHandlers ).toHaveBeenCalledTimes( 1 );
		} );
	} );

	describe( '#updateState', () => {
		it( 'should update the states of the apis', () => {
			apis.test.updateState = jest.fn();

			const now = new Date();
			const wrapper = mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);

			expect( apis.test.updateState ).toHaveBeenCalledTimes( 1 );
			expect( apis.test.updateState ).toHaveBeenCalledWith( {} );

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

			apis.test.updateState = jest.fn();
			wrapper.setProps( { rootData: { test: { ...expectedApiState }, } } );

			expect( apis.test.updateState ).toHaveBeenCalledTimes( 1 );
			expect( apis.test.updateState ).toHaveBeenCalledWith( expectedApiState );
		} );
	} );

	describe( '#dataRequested', () => {
		it( 'should dispatch when called from an api.', () => {
			const dataRequested = jest.fn();

			mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);

			apis.test.dataRequested( '123', [ 'thing', '1' ], { param: 1 } );
			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( 'test', '123', [ 'thing', '1' ], { param: 1 } );
		} );
	} );

	describe( '#dataReceived', () => {
		it( 'should dispatch when called from an api.', () => {
			const dataReceived = jest.fn();

			mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ dataReceived }
					errorReceived={ actions.errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);

			apis.test.dataReceived( '123', [ 'thing', '1' ], { param: 1 }, { data: true } );
			expect( dataReceived ).toHaveBeenCalledTimes( 1 );
			expect( dataReceived ).toHaveBeenCalledWith( 'test', '123', [ 'thing', '1' ], { param: 1 }, { data: true } );
		} );
	} );

	describe( '#errorReceived', () => {
		it( 'should dispatch when called from an api.', () => {
			const errorReceived = jest.fn();

			mount(
				<FreshDataReduxProvider
					apis={ apis }
					rootData={ {} }
					dataRequested={ actions.dataRequested }
					dataReceived={ actions.dataReceived }
					errorReceived={ errorReceived }
				>
					<span>Testing</span>
				</FreshDataReduxProvider>
			);

			apis.test.errorReceived( '123', [ 'thing', '1' ], { param: 1 }, { message: '😦' } );
			expect( errorReceived ).toHaveBeenCalledTimes( 1 );
			expect( errorReceived ).toHaveBeenCalledWith( 'test', '123', [ 'thing', '1' ], { param: 1 }, { message: '😦' } );
		} );
	} );
} );
