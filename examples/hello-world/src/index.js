import React from 'react';
import { render } from 'react-dom';
import { registerApi } from 'fresh-data';
import './index.css';
import App from './App';
import createStore from './create-store';
import reducer from './reducer';
import createTestApi from './test-api';

const methods = {
	// TODO: Add methods.
};

const testApi = createTestApi( methods );
registerApi( testApi );

const store = createStore( reducer );

render( <App store={ store } />, document.getElementById( 'root' ) );
