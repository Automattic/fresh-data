export const DEFAULT_MAX_UPDATE = 30000;
export const DEFAULT_MIN_UPDATE = 500;

/**
 * Compares requirements against current state for update information.
 * Takes a list of requirements and the current state, both keyed by resourceName,
 * and returns update information which contains an array of resourceNames that are
 * currently needed and when the next update cycle should run, in milleseconds.
 * @param {Object} requirementsByResource List of requirements keyed by resourceName.
 * @param {Object} resourceState State indexed by resourceName.
 * @param {number} [minUpdate] Minimum nextUpdate value.
 * @param {number} [maxUpdate] Maximum nextUpdate value.
 * @param {Date} [now] Current time (used for tests).
 * @return {Object} updateInfo: { nextUpdate, updates }
 * @see combineComponentRequirements
 */
export default function calculateUpdates(
	requirementsByResource,
	resourceState,
	minUpdate = DEFAULT_MIN_UPDATE,
	maxUpdate = DEFAULT_MAX_UPDATE,
	now = new Date()
) {
	const updateInfo = { updates: [], nextUpdate: maxUpdate };
	appendUpdatesForResources( updateInfo, requirementsByResource, resourceState, now );
	updateInfo.nextUpdate = Math.max( updateInfo.nextUpdate, minUpdate );
	return updateInfo;
}

/**
 * Iterates resources to analyze needed updates.
 * @param {Object} updateInfo Update information to be mutated by this function.
 * @param {Object} requirementsByResource List of requirements keyed by resource.
 * @param {Object} resourceState State indexed by resourceName.
 * @param {Date} [now] Current time (used for tests).
 * @see calculateUpdates
 * @see appendUpdatesForResource
 */
function appendUpdatesForResources( updateInfo, requirementsByResource, resourceState, now ) {
	Object.keys( requirementsByResource ).forEach( ( resourceName ) => {
		const requirements = requirementsByResource[ resourceName ];
		const state = resourceState[ resourceName ] || {};
		appendUpdatesForResource( updateInfo, resourceName, requirements, state, now );
	} );
}

/**
 * Analyzes a resource's requirements against its current state..
 * @param {Object} updateInfo Update information to be mutated by this function.
 * @param {string} resourceName Name of the resource to be analyzed.
 * @param {Object} requirements The requirements for this level of the tree.
 * @param {Object} state The current state for this resource.
 * @param {Date} [now] Current time (used for tests).
 * @see appendUpdatesForResources
 */
function appendUpdatesForResource( updateInfo, resourceName, requirements, state, now ) {
	const { lastRequested, lastReceived } = state;
	const isRequested = lastRequested && ( ! lastReceived || lastRequested > lastReceived );
	const timeoutLeft = getTimeoutLeft( requirements.timeout, state, now );
	const freshnessLeft = getFreshnessLeft( requirements.freshness, state, now );
	const nextUpdate = isRequested && 0 >= freshnessLeft ? timeoutLeft : freshnessLeft;

	updateInfo.nextUpdate = Math.min( updateInfo.nextUpdate, nextUpdate );
	if ( nextUpdate < 0 ) {
		updateInfo.updates.push( resourceName );
	}
}

/**
 * Calculates the remaining time left until a timeout is reached.
 * @param {Object} timeout The timeout requirements in milliseconds.
 * @param {Object} state The matching state for the resource.
 * @param {Date} now Current time (used for tests).
 * @return {number} Time left until timeout, or MAX_SAFE_INTEGER if not applicable.
 */
export function getTimeoutLeft( timeout, state, now ) {
	const lastRequested = state.lastRequested || Number.MIN_SAFE_INTEGER;
	const lastReceived = state.lastReceived || Number.MIN_SAFE_INTEGER;

	if ( timeout && lastRequested && lastRequested > lastReceived ) {
		return timeout - ( now - lastRequested );
	}
	return Number.MAX_SAFE_INTEGER;
}

/**
 * Calculates the time remaining until this data is considered stale.
 * @param {Object} freshness The freshness requirements in milliseconds.
 * @param {Object} state The matching state for the resource.
 * @param {Date} now Current time (used for tests).
 * @return {number} Time left until stale, or MAX_SAFE_INTEGER if not applicable.
 */
export function getFreshnessLeft( freshness, state, now ) {
	const { lastReceived } = state;

	if ( freshness && lastReceived ) {
		return freshness - ( now - lastReceived );
	}
	return freshness ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
}

