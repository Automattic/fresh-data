import React from 'react';
import PropTypes from 'prop-types';
import { MINUTE, SECOND } from '@fresh-data/framework';
import { withApiClient } from '@fresh-data/react-provider';
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

function PostList( { isLoading, posts, siteUrl } ) {
	const heading = isLoading ? 'Loading' : 'Recent Posts for';

	return (
		<div className="post-list">
			<h3>{ heading }</h3>
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
	const { getPostsPage, isPostsPageLoading } = selectors;
	const params = { page: 1, perPage: 10 };
	const posts = getPostsPage( { freshness: 5 * MINUTE, timeout: 3 * SECOND }, params );
	const isLoading = isPostsPageLoading( params );
	return {
		isLoading,
		posts,
	};
}

export default withApiClient( { mapSelectorsToProps } )( PostList );
