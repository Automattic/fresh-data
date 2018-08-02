import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { ApiProvider } from '@fresh-data/framework';
import './App.css';
import Message from './Message';
import testApi from './test-api';

const App = ( { store } ) => (
	<ReduxProvider store={ store } >
		<ApiProvider apiName={ 'test-api' } apiSpec={ testApi }>
			<div className="App">
				<header className="App-header">
					<h1 className="App-title">Fresh Data</h1>
				</header>
				<Message />
			</div>
		</ApiProvider>
	</ReduxProvider>
);

export default App;
