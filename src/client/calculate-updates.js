import { find } from 'lodash';
import { HOUR } from '../utils/constants';

export const DEFAULT_NEXT_UPDATE = 1 * HOUR;

export default function calculateUpdates(
	requirementsByEndpoint,
	endpointsState,
	now = new Date()
) {
	const updateInfo = { updates: [], nextUpdate: DEFAULT_NEXT_UPDATE };
	appendUpdatesForEndpoints( updateInfo, [], requirementsByEndpoint, endpointsState, now );
	return updateInfo;
}

function appendUpdatesForEndpoints( updateInfo, endpointPath, requirementsByEndpoint, endpointsState, now ) {
	return Object.keys( requirementsByEndpoint ).forEach( ( endpointName ) => {
		const path = [ ...endpointPath, endpointName ];
		const requirements = requirementsByEndpoint[ endpointName ];
		const state = endpointsState[ endpointName ] || {};
		appendUpdatesForEndpoint( updateInfo, path, undefined, requirements, state, now );
	} );
}

function appendUpdatesForQueries( updateInfo, path, requirementsByQuery, queriesState, now ) {
	requirementsByQuery.forEach( ( requirements ) => {
		const { params } = requirements;
		const state = find( queriesState, { params } ) || {};
		appendUpdatesForEndpoint( updateInfo, path, params, requirements, state, now );
	} );
}

function appendUpdatesForEndpoint( updateInfo, endpointPath, params, requirements, state, now ) {
	if ( requirements.endpoints ) {
		appendUpdatesForEndpoints(
			updateInfo,
			endpointPath,
			requirements.endpoints,
			state.endpoints || {},
			now
		);
	}

	if ( requirements.queries ) {
		appendUpdatesForQueries(
			updateInfo,
			endpointPath,
			requirements.queries,
			state.queries || {},
			now
		);
	}

	const timeoutLeft = getTimeoutLeft( requirements, state, now );
	const freshnessLeft = getFreshnessLeft( requirements, state, now );
	const nextUpdate = Math.min( timeoutLeft, freshnessLeft );

	updateInfo.nextUpdate = Math.min( updateInfo.nextUpdate, nextUpdate );
	if ( nextUpdate < 0 ) {
		updateInfo.updates.push( { endpointPath, params } );
	}
}

export function getTimeoutLeft( requirements, state, now ) {
	const { timeout } = requirements;
	const { lastRequested } = state;

	if ( timeout && lastRequested ) {
		return ( lastRequested + timeout ) - now;
	}
	return Number.MAX_SAFE_INTEGER;
}

export function getFreshnessLeft( requirements, state, now ) {
	const { freshness } = requirements;
	const { lastReceived } = state;

	if ( freshness && lastReceived ) {
		return ( lastReceived + freshness ) - now;
	}
	return freshness ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
}
