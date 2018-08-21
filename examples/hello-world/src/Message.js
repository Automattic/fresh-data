import React from 'react';
import { SECOND } from '@fresh-data/framework';
import { withApiClient } from '@fresh-data/react-provider';

class Message extends React.Component {
	state = { counter: 0 };

	componentDidMount() {
		const intervalId = setInterval( this.updateCounter, 250 );
		this.setState( () => {
			return { intervalId, startTime: new Date() };
		} );
	}

	componentWillUnmount() {
		const { intervalId } = this.state;
		if ( intervalId ) {
			clearInterval( intervalId );
		}
	}

	updateCounter = () => {
		this.setState( ( state ) => {
			const { greetings } = this.props;
			const { startTime } = state;
			const now = new Date();
			const counter = Math.round( ( now - startTime ) / 1000 );
			const index = counter % greetings.length;
			return { index };
		} );
	}

	render() {
		const { greetings } = this.props;
		const { index } = this.state;
		let greeting = '';

		if ( greetings ) {
			greeting = greetings[ index ];
		}

		return (
			<p className="App-intro">
				{ greeting }
			</p>
		);
	}
}

function mapSelectorsToProps( selectors ) {
	const { getGreetings } = selectors;

	const greetings = getGreetings( { freshness: 10 * SECOND } );

	return {
		greetings,
	};
}

export default withApiClient( { mapSelectorsToProps } )( Message );
