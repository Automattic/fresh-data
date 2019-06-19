import { find, union } from 'lodash';
/* TODO: Update devinfo
import { getFreshnessLeft, getTimeoutLeft } from '../client/calculate-updates';
*/

/**
 * Possible statuses of a resource.
 */
export const STATUS = {
	overdue: 'overdue',
	fetching: 'fetching',
	stale: 'stale',
	fresh: 'fresh',
	notRequired: 'notRequired',
};

/**
 * Compiles information about the resources available from a fresh-data client.
 * @param {Object} client A fresh-data client to be inspected.
 * @return {Object} A list of detailed resource info objects, keyed by resource name.
 */
export default function resources( client ) {
	const resourceState = client.state.resources || {};
	const requirements = client.requirementsByResource;
	const resourceNames = union( Object.keys( resourceState ), Object.keys( requirements ) );

	return resourceNames.reduce( ( resourceInfo, resourceName ) => {
		const resource = resourceState[ resourceName ] || {};
		const { data } = resource;
		const status = getStatus( resource, requirements[ resourceName ] );
		const summary = getSummary( status, resource, requirements[ resourceName ] );

		resourceInfo[ resourceName ] = {
			status,
			summary,
			data,
		};

		if ( requirements[ resourceName ] ) {
			const combinedRequirement = convertRequirement( requirements[ resourceName ] );
			const componentsRequiring = getComponentsForResource( client.requirementsByComponent, resourceName );
			resourceInfo[ resourceName ].combinedRequirement = combinedRequirement;
			resourceInfo[ resourceName ].componentsRequiring = componentsRequiring;
		}

		return resourceInfo;
	}, {} );
}

function getStatus( resource, requirement ) {
	if ( ! requirement ) {
		return STATUS.notRequired;
	}

	const { freshness, timeout } = requirement;
	const now = new Date();
	const freshnessLeft = getFreshnessLeft( freshness, resource, now );

	if ( resource && resource.lastRequested > resource.lastReceived ) {
		const timeoutLeft = getTimeoutLeft( timeout, resource, now );
		if ( timeoutLeft < 0 ) {
			return STATUS.overdue;
		}
		return STATUS.fetching;
	}
	if ( freshnessLeft < 0 ) {
		return STATUS.stale;
	}
	return STATUS.fresh;
}

function getSummary( status, resource, requirement ) {
	const now = new Date();

	switch ( status ) {
		case STATUS.overdue:
			const timeout = getTimeoutLeft( requirement.timeout, resource, now );
			return `Timed out for ${ millisToString( -timeout ) }`;
		case STATUS.fetching:
			const timeoutLeft = getTimeoutLeft( requirement.timeout, resource, now );
			return `${ millisToString( timeoutLeft ) } until timeout`;
		case STATUS.stale:
			const staleness = getFreshnessLeft( requirement.freshness, resource, now );
			return `Stale for ${ millisToString( -staleness ) }`;
		case STATUS.fresh:
			const freshnessLeft = getFreshnessLeft( requirement.freshness, resource, now );
			return `Fresh for ${ millisToString( freshnessLeft ) }`;
		case STATUS.notRequired:
		default:
			return 'Resource is not fetched directly.';
	}
}

function convertRequirement( requirement = {} ) {
	const { freshness, timeout, ...other } = requirement;

	return {
		freshness: millisToString( freshness ),
		timeout: millisToString( timeout ),
		...other,
	};
}

const SECOND_IN_MILLIS = 1000;
const MINUTE_IN_MILLIS = SECOND_IN_MILLIS * 60;
const HOUR_IN_MILLIS = MINUTE_IN_MILLIS * 60;

function millisToString( millis ) {
	if ( ! millis ) {
		return '';
	}

	const hours = Math.floor( millis / HOUR_IN_MILLIS );
	millis -= ( hours * HOUR_IN_MILLIS );

	const minutes = Math.floor( millis / MINUTE_IN_MILLIS );
	millis -= ( minutes * MINUTE_IN_MILLIS );

	const seconds = millis / SECOND_IN_MILLIS;

	let str = '';
	str = hours ? `${ hours } hours ` : str;
	str = minutes ? `${ str }${ minutes } mins ` : str;
	str = seconds ? `${ str }${ seconds } secs ` : str;
	return str;
}

function getComponentsForResource( requirementsByComponent, resourceName ) {
	const components = [];

	requirementsByComponent.forEach( ( requirements, component ) => {
		const requirement = find( requirements, { resourceName } );
		if ( requirement ) {
			components.push( component );
		}
	} );

	return components.length ? components : null;
}
