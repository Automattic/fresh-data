import React from 'react';
import PropTypes from 'prop-types';
import { MINUTE } from '@fresh-data/framework';
import { withApiClient } from '@fresh-data/react-provider';
import UserStars from './UserStars';

function renderLoading( userName ) {
	return (
		<div>
			<h3>{ userName }...</h3>
		</div>
	);
}

function renderError( userName, message ) {
	return (
		<div>
			<h3>Error retrieving &quot;{ userName }&quot;</h3>
			<p>{ message }</p>
		</div>
	);
}

function renderUser( userName, user ) {
	return (
		<div>
			<h3>{ userName }</h3>
			<div>
				<p>Bio: { user.bio }</p>
				<p>Location: { user.location }</p>
				<p>Following: { user.following }</p>
				<p>Followers: { user.followers }</p>
			</div>
			<UserStars userName={ userName } />
		</div>
	);
}

function UserInfo( { error, user, userName } ) {
	if ( user ) {
		return renderUser( userName, user );
	} else if ( error ) {
		return renderError( userName, error );
	} else if ( userName ) {
		return renderLoading( userName );
	}
	return null;
}

UserInfo.propTypes = {
	userName: PropTypes.string.isRequired,
	error: PropTypes.string,
	user: PropTypes.object,
};

function mapSelectorsToProps( selectors, ownProps ) {
	const { userName } = ownProps;
	const { getUserError, getUser } = selectors;

	const error = getUserError( userName );
	const user = getUser( { freshness: 5 * MINUTE }, userName );

	return {
		error,
		user,
	};
}

export default withApiClient( { mapSelectorsToProps } )( UserInfo );
