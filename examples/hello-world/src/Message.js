import React from 'react';
import { withApiClient, SECOND } from 'fresh-data';

const Message = ( { noun } ) => (
	<p className="App-intro">
		Hello { noun || 'stranger' }!
	</p>
);

function mapApiToProps( selectors ) {
	const noun = selectors.getNoun( { freshness: 5 * SECOND } );

	return {
		noun,
	};
}

function getClientKey( props ) {
	return { api: 'test-api', id: props.siteId };
}

export default withApiClient( getClientKey, mapApiToProps )( Message );
