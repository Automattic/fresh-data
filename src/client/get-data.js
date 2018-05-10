import { find, get } from 'lodash';

export default ( clientState ) => ( endpointPath, params ) => {
	const expandedPath = endpointPath.reduce( ( path, node ) => {
		path.push( 'endpoints' );
		path.push( node );
		return path;
	}, [] );
	const endpoint = get( clientState, expandedPath, {} );

	if ( ! params ) {
		return endpoint.data ? endpoint.data : null;
	}

	const query = find( endpoint.queries, { params } );
	return query && query.data ? query.data : null;
};
