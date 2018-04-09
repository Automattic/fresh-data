import React from 'react';
import { connect } from 'react-redux';

const Message = ( { subject } ) => (
	<p className="App-intro">
		Hello { subject }!
	</p>
);

function mapStateToProps( state ) {
	const subject = state;

	return {
		subject,
	};
}

export default connect( mapStateToProps )( Message );
