import debugFactory from 'debug';
import { isObject, isString } from 'lodash';

const debug = debugFactory( 'fresh-data:validation' );

export default function isApiValid( api ) {
	if ( ! isObject( api ) ) {
		debug( 'api must be an object.' );
		return false;
	}
	if ( ! isString( api.name ) ) {
		debug( 'api.name must be a string.' );
		return false;
	}
	if ( ! isObject( api.endpoints ) ) {
		debug( 'api.endpoints must be an object.' );
		return false;
	}
	if ( ! isObject( api.selectors ) ) {
		debug( 'api.selectors must be an object.' );
		return false;
	}
	if ( ! isObject( api.methods ) ) {
		debug( 'api.methods must be an object.' );
		return false;
	}
	return true;
}
