import React from 'react';
import './App.css';

class App extends React.Component {
	render() {
		return (
			<div className="App">
				<header className="App-header">
					<h1 className="App-title">Fresh Data</h1>
				</header>
				<header className="GH-header">
					<h2><a className="GH-title" href="https://developer.github.com/v3">GitHub REST API</a></h2>
				</header>
				<p>
					Hello!
				</p>
			</div>
		);
	}
}

export default App;
