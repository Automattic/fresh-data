import React from 'react';
import PropTypes from 'prop-types';
import { MINUTE } from '@fresh-data/framework';
import { withApiClient } from '@fresh-data/react-provider';

function renderStarLi( repo ) {
	return (
		<li key={ repo.id }>
			<span className="repo-name">{ repo.full_name }</span>
			<span className="repo-detail">({ repo.stargazers_count } stargazers)</span>
		</li>
	);
}

function UserStars( { stars } ) {
	return (
		<div>
			<h4>Starred repositories</h4>
			{ stars && ( <ul> { stars.map( renderStarLi ) } </ul> ) }
		</div>
	);
}

UserStars.propTypes = {
	userName: PropTypes.string.isRequired,
	user: PropTypes.object,
};

function mapSelectorsToProps( selectors, ownProps ) {
	const { userName } = ownProps;
	const { getUserStars } = selectors;

	return {
		stars: getUserStars( { freshness: 5 * MINUTE }, userName ),
	};
}

export default withApiClient( { mapSelectorsToProps } )( UserStars );
