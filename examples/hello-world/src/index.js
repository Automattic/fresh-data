import React from 'react';
import ReactDOM from 'react-dom';

class App extends React.Component {
	render() {
		return (
			<div>
				<h2>Test</h2>
			</div>
		);
	}
}

ReactDOM.render( <App />, document.getElementById( 'app' ) );

