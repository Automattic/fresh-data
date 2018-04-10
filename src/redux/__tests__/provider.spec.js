import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider as ReduxProvider } from 'react-redux';
import Provider from '../provider';

describe( 'Provider', () => {
	const reducer = ( state ) => state;
	const store = createStore( reducer );

	it( 'should render without crashing', () => {
		const div = document.createElement( 'div' );
		const testApp = (
			<ReduxProvider store={ store }>
				<Provider>
					<span>Testing</span>
				</Provider>
			</ReduxProvider>
		);
		ReactDOM.render( testApp, div );
		ReactDOM.unmountComponentAtNode( div );
	} );
} );
