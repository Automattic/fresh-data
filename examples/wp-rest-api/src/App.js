import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { FreshDataProvider } from 'fresh-data';
import './App.css';

const apis = {
};

const App = ( { store } ) => {
	return (
		<ReduxProvider store={ store } >
			<FreshDataProvider apis={ apis }>
				<div className="App">
					<header className="App-header">
						<h1 className="App-title">Fresh Data</h1>
					</header>
					<header className="WP-header">
						<h2><a className="WP-title" href="http://wp-api.org">WordPress REST API</a></h2>
					</header>
					<p className="App-intro">
						TODO: Add components here.
					</p>
				</div>
			</FreshDataProvider>
		</ReduxProvider>
	);
};

export default App;
