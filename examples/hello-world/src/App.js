import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { FreshDataProvider } from 'fresh-data';
import './App.css';
import Message from './Message';

const App = ( { store } ) => (
	<ReduxProvider store={ store } >
		<FreshDataProvider>
			<div className="App">
				<header className="App-header">
					<h1 className="App-title">Fresh Data</h1>
				</header>
				<Message siteId={ 1 } />
			</div>
		</FreshDataProvider>
	</ReduxProvider>
);

export default App;
