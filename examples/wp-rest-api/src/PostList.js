import React from 'react';
import PropTypes from 'prop-types';
import { MINUTE, SECOND, withApiClient } from '@fresh-data/framework';
import HtmlToReact from 'html-to-react';

function renderPostLine( post ) {
	const htmlParser = HtmlToReact.Parser();
	const title = htmlParser.parse( post.title.rendered );
	const date = new Date( post.date_gmt + 'Z' );

	return (
		<tr className="post-line" key={ post.id }>
			<td className="post-date">{ date.toLocaleString() }</td>
			<td className="post-title"><a href={ post.link }>{ title }</a></td>
		</tr>
	);
}

function PostList( { posts, siteUrl } ) {
	return (
		<div className="post-list">
			<h3>Recent Posts for</h3>
			<h4><pre>{ siteUrl }</pre></h4>
			<table>
				<tbody>
					{ posts && posts.map( renderPostLine ) }
				</tbody>
			</table>
		</div>
	);
}

PostList.propTypes = {
	siteUrl: PropTypes.string,
	posts: PropTypes.array,
};

function mapSelectorsToProps( selectors ) {
	const { getPosts } = selectors;
	const posts = getPosts( { freshness: 5 * MINUTE, timeout: 3 * SECOND } );
	return {
		posts,
	};
}

function getClientKey( ownProps ) {
	return ownProps.siteUrl;
}

export default withApiClient( 'wp-rest-api', { mapSelectorsToProps, getClientKey } )( PostList );
