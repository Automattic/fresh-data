import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { FreshDataProvider } from 'fresh-data';
import './App.css';
import Message from './Message';
import TestApi from './test-api';

const apis = {
	test: new TestApi(),
};

const App = ( { store } ) => (
	<ReduxProvider store={ store } >
		<FreshDataProvider apis={ apis }>
			<div className="App">
				<header className="App-header">
					<h1 className="App-title">Fresh Data</h1>
				</header>
				<Message clientKey="123" />
			</div>
		</FreshDataProvider>
	</ReduxProvider>
);

export default App;
