import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider as ReduxProvider } from 'react-redux';
import FreshDataReduxProvider from '../provider';

describe( 'FreshDataReduxProvider', () => {
	it( 'should render without crashing', () => {
		const reducer = ( state ) => state;
		const store = createStore( reducer );
		const div = document.createElement( 'div' );
		const testApp = (
			<ReduxProvider store={ store }>
				<FreshDataReduxProvider>
					<span>Testing</span>
				</FreshDataReduxProvider>
			</ReduxProvider>
		);
		ReactDOM.render( testApp, div );
		ReactDOM.unmountComponentAtNode( div );
	} );

	it( 'should update api clients with initial state', () => {
		const state = { testRoot: {} };
		const reducer = () => state;
		const store = createStore( reducer );
		const update = jest.fn();
		const div = document.createElement( 'div' );
		const testApp = (
			<ReduxProvider store={ store }>
				<FreshDataReduxProvider rootPath={ [ 'testRoot' ] } update={ update }>
					<span>Testing</span>
				</FreshDataReduxProvider>
			</ReduxProvider>
		);
		ReactDOM.render( testApp, div );
		ReactDOM.unmountComponentAtNode( div );

		expect( update ).toHaveBeenCalledTimes( 1 );
		expect( update ).toHaveBeenCalledWith( state.testRoot );
	} );

	it( 'should update api clients when state changes', () => {
		const a = { a: true };
		const b = { b: true };
		const states = [
			{ testRoot: a },
			{ testRoot: a },
			{ testRoot: b },
		];
		const reducer = ( state, action ) => {
			if ( 'TEST_ACTION' === action.type ) {
				return states[ action.index ];
			}
			return state;
		};

		const store = createStore( reducer );
		const update = jest.fn();
		const div = document.createElement( 'div' );
		const testApp = (
			<ReduxProvider store={ store }>
				<FreshDataReduxProvider rootPath={ [ 'testRoot' ] } update={ update }>
					<span>Testing</span>
				</FreshDataReduxProvider>
			</ReduxProvider>
		);
		ReactDOM.render( testApp, div );

		store.dispatch( { type: 'TEST_ACTION', index: 0 } );
		store.dispatch( { type: 'TEST_ACTION', index: 1 } );
		store.dispatch( { type: 'TEST_ACTION', index: 2 } );
		ReactDOM.unmountComponentAtNode( div );

		expect( update ).toHaveBeenCalledTimes( 3 );
		expect( update ).toHaveBeenCalledWith( undefined );
		expect( update ).toHaveBeenCalledWith( states[ 0 ].testRoot );
		expect( update ).toHaveBeenCalledWith( states[ 1 ].testRoot );
	} );
} );
