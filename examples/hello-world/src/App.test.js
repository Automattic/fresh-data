import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import createStore from './create-store';
import reducer from './reducer';

it( 'renders without crashing', () => {
	const store = createStore( reducer );
  const div = document.createElement( 'div' );
  ReactDOM.render( <App store={ store } />, div );
  ReactDOM.unmountComponentAtNode( div );
} );
