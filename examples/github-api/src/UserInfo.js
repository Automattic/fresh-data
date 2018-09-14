import React from 'react';
import PropTypes from 'prop-types';
import { MINUTE, withApiClient } from '@fresh-data/react-provider';
import UserStars from './UserStars';

function UserInfo( { isLoading, user, userName } ) {
	const userInfo = user && (
		<div>
			<p>Bio: { user.bio }</p>
			<p>Location: { user.location }</p>
			<p>Following: { user.following }</p>
			<p>Followers: { user.followers }</p>
		</div>
	);

	return (
		<div>
			<h3>{ userName }{ ! user || isLoading ? '...' : '' }</h3>
			{ userInfo }
			{ user && <UserStars userName={ userName } /> }
		</div>
	);
}

UserInfo.propTypes = {
	userName: PropTypes.string.isRequired,
};

function mapSelectorsToProps( selectors, ownProps ) {
	const { userName } = ownProps;
	const { isLoadingUser, getUser } = selectors;

	const isLoading = isLoadingUser( userName );
	const user = getUser( { freshness: 5 * MINUTE }, userName );

	return {
		isLoading,
		user,
	};
}

export default withApiClient( { mapSelectorsToProps } )( UserInfo );
