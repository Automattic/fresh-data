import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import PostList from './PostList';
import SiteSelect from './SiteSelect';
import './App.css';

const App = ( { store } ) => {
	return (
		<ReduxProvider store={ store } >
			<div className="App">
				<header className="App-header">
					<h1 className="App-title">Fresh Data</h1>
				</header>
				<header className="WP-header">
					<h2><a className="WP-title" href="http://wp-api.org">WordPress REST API</a></h2>
				</header>
				<SiteSelect>
					<PostList />
				</SiteSelect>
			</div>
		</ReduxProvider>
	);
};

export default App;
