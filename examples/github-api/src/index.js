import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import createStore from './create-store';
import reducer from './reducer';
import 'babel-polyfill';

const store = createStore( reducer );

ReactDOM.render( <App store={ store } />, document.getElementById( 'root' ) );
