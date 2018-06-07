import React from 'react';
import PropTypes from 'prop-types';
import { MINUTE, SECOND, withApiClient } from 'fresh-data';
import HtmlToReact from 'html-to-react';

function renderPostLine( post ) {
	const htmlParser = HtmlToReact.Parser();
	const title = htmlParser.parse( post.title.rendered );
	const date = new Date( post.date_gmt + 'Z' );

	return (
		<div className="post_line" key={ post.id }>
			<a href={ post.link }>{ title }</a>
			&nbsp;
			<span className="post_date">({ date.toLocaleString() })</span>
		</div>
	);
}

function PostList( { posts, siteUrl } ) {
	return (
		<div>
			<h3>Recent Posts for</h3>
			<h4><pre>{ siteUrl }</pre></h4>
			<div>
				{ posts && posts.map( renderPostLine ) }
			</div>
		</div>
	);
}

PostList.propTypes = {
	siteUrl: PropTypes.string,
	posts: PropTypes.array,
};

function mapApiToProps( selectors ) {
	const { getPosts } = selectors;
	const posts = getPosts( { freshness: 5 * MINUTE, timeout: 3 * SECOND } );
	return {
		posts,
	};
}

function getClientKey( ownProps ) {
	return ownProps.siteUrl;
}

export default withApiClient( 'wp-rest-api', mapApiToProps, getClientKey )( PostList );
