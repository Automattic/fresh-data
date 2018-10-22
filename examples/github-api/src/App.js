import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import UserSelect from './UserSelect';
import UserInfo from './UserInfo';
import './App.css';

function App( { store } ) {
	return (
		<ReduxProvider store={ store }>
			<div className="App">
				<header className="App-header">
					<h1 className="App-title">Fresh Data</h1>
				</header>
				<header className="GH-header">
					<h2><a className="GH-title" href="https://developer.github.com/v3">GitHub REST API</a></h2>
				</header>
				<UserSelect>
					{ ( userName ) => (
						<UserInfo userName={ userName } />
					) }
				</UserSelect>
			</div>
		</ReduxProvider>
	);
}

export default App;
