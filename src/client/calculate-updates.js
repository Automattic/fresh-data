import { find } from 'lodash';
import { HOUR } from '../utils/constants';

export const DEFAULT_NEXT_UPDATE = 1 * HOUR;

/**
 * Compares requirements against current state for update information.
 * Takes a requirement tree by endpoint (returned by combineComponentRequirements)
 * and the current data state of the matching endpoints, and returns update information
 * which contains an array of updates that are currently needed, and when the
 * next update cycle should run, in milleseconds.
 * @param {Object} requirementsByEndpoint Tree with endpoint names for top-level keys.
 * @param {Object} endpointsState State indexed by enpoint names containing API data.
 * @param {Date} [now] Current time (used for tests).
 * @return {Object} updateInfo: { nextUpdate, updates }
 * @see combineComponentRequirements
 */
export default function calculateUpdates(
	requirementsByEndpoint,
	endpointsState,
	now = new Date()
) {
	const updateInfo = { updates: [], nextUpdate: DEFAULT_NEXT_UPDATE };
	appendUpdatesForEndpoints( updateInfo, [], requirementsByEndpoint, endpointsState, now );
	return updateInfo;
}

/**
 * Iterates endpoints to analyze needed updates.
 * Each endpoint is analyzed individually in the nested structure.
 * @param {Object} updateInfo Update information to be mutated by this function.
 * @param {Array} endpointPath An array of strings indicating the nested endpoint path.
 * @param {Object} requirementsByEndpoint The requirements for this level of the tree.
 * @param {Object} endpointsState The state for this level of the tree.
 * @param {Date} [now] Current time (used for tests).
 * @see calculateUpdates
 * @see appendUpdatesForEndpoint
 */
function appendUpdatesForEndpoints( updateInfo, endpointPath, requirementsByEndpoint, endpointsState, now ) {
	Object.keys( requirementsByEndpoint ).forEach( ( endpointName ) => {
		const path = [ ...endpointPath, endpointName ];
		const requirements = requirementsByEndpoint[ endpointName ];
		const state = endpointsState[ endpointName ] || {};
		appendUpdatesForEndpoint( updateInfo, path, undefined, requirements, state, now );
	} );
}

/**
 * Iterates endpoint queries to analyze needed updates.
 * Each query is analyzed indivually in the nested structure.
 * @param {Object} updateInfo Update information to be mutated by this function.
 * @param {Array} endpointPath An array of strings indicating the nested endpoint path.
 * @param {Object} requirementsByQuery The requirements for this level of the tree.
 * @param {Object} queriesState The state for this level of the tree.
 * @param {Date} [now] Current time (used for tests).
 * @see appendUpdatesForEndpoint
 */
function appendUpdatesForQueries( updateInfo, endpointPath, requirementsByQuery, queriesState, now ) {
	requirementsByQuery.forEach( ( requirements ) => {
		const { params } = requirements;
		const state = find( queriesState, { params } ) || {};
		appendUpdatesForEndpoint( updateInfo, endpointPath, params, requirements, state, now );
	} );
}

/**
 * Analyzes an endpoint's child endpoints, queries, and metadata.
 * First, this function checks for child endpoints and recurses to handle them.
 * Then, it checks any queries for this endpoint and appends their updates.
 * Last, it checks for requirements on this endpoint.
 * @param {Object} updateInfo Update information to be mutated by this function.
 * @param {Array} endpointPath An array of strings indicating the nested endpoint path.
 * @param {Object} [params] If a query, the query parameters, otherwise undefined.
 * @param {Object} requirements The requirements for this level of the tree.
 * @param {Object} state The state for this level of the tree.
 * @param {Date} [now] Current time (used for tests).
 * @see appendUpdatesForEndpoints
 * @see appendUpdatesForQueries
 */
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

/**
 * Calculates the remaining time left until a timeout is reached.
 * @param {Object} requirements The requirements for a given endpoint.
 * @param {Object} state The matching state for the endpoint.
 * @param {Date} now Current time (used for tests).
 * @return {number} Time left until timeout, or MAX_SAFE_INTEGER if not applicable.
 */
export function getTimeoutLeft( requirements, state, now ) {
	const { timeout } = requirements;
	const { lastRequested } = state;

	if ( timeout && lastRequested ) {
		return ( lastRequested + timeout ) - now;
	}
	return Number.MAX_SAFE_INTEGER;
}

/**
 * Calculates the time remaining until this data is considered stale.
 * @param {Object} requirements The requirements for a given endpoint.
 * @param {Object} state The matching state for the endpoint.
 * @param {Date} now Current time (used for tests).
 * @return {number} Time left until stale, or MAX_SAFE_INTEGER if not applicable.
 */
export function getFreshnessLeft( requirements, state, now ) {
	const { freshness } = requirements;
	const { lastReceived } = state;

	if ( freshness && lastReceived ) {
		return ( lastReceived + freshness ) - now;
	}
	return freshness ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
}

