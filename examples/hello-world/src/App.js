import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import './App.css';
import Message from './Message';

const App = ( { store } ) => (
	<ReduxProvider store={ store } >
		<div className="App">
			<header className="App-header">
				<h1 className="App-title">Fresh Data</h1>
			</header>
			<Message />
		</div>
	</ReduxProvider>
);

export default App;
