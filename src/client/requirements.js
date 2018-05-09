import { findIndex } from 'lodash';
import { SECOND } from '../utils/constants';

export const DEFAULTS = {
	freshness: Number.MAX_SAFE_INTEGER,
	timeout: 20 * SECOND,
};

/**
 * Combines component requirements into a requirements list by endpoint.
 * @param {Map} requirementsByComponent Key: Component, Value: requirements with endpoint/params property.
 * @return {Object} New requirements endpoint tree.
 */
export function combineComponentRequirements( requirementsByComponent ) {
	const requirementsByEndpoint = {};

	requirementsByComponent.forEach( ( requirements ) => {
		requirements.forEach( ( requirement ) => {
			const { endpoint, params, ...reqParams } = requirement;
			addEndpointRequirement( requirementsByEndpoint, reqParams, endpoint, params );
		} );
	} );

	return requirementsByEndpoint;
}

/**
 * Mutates the state of requirementsByEndpoint by adding a given endpoint requirement to it.
 * @param {Object} requirementsByEndpoint Endpoint tree with requirement leaf nodes.
 * @param {Object} reqParams Requirement parameters ( e.g. { freshness: 30 * SECOND } )
 * @param {Array} endpointPath Array of strings representing endpoint path.
 * @param {Object} params List of parameters for endpoint API call (optional).
 */
export function addEndpointRequirement( requirementsByEndpoint, reqParams, endpointPath, params ) {
	const [ endpoint, ...remainingPath ] = endpointPath;

	if ( remainingPath.length === 0 ) {
		if ( params ) {
			addQueryEndpointRequirementParams( requirementsByEndpoint, reqParams, endpoint, params );
		} else {
			addEndpointRequirementParams( requirementsByEndpoint, reqParams, endpoint );
		}
	} else {
		const endpointRequirements = requirementsByEndpoint[ endpoint ] || {};
		const endpoints = endpointRequirements.endpoints || {};
		addEndpointRequirement( endpoints, reqParams, remainingPath, params );

		endpointRequirements.endpoints = endpoints;
		requirementsByEndpoint[ endpoint ] = endpointRequirements;
	}
}

function addEndpointRequirementParams( requirementsByEndpoint, reqParams, endpoint ) {
	const endpointRequirements = requirementsByEndpoint[ endpoint ] || { ...DEFAULTS };
	addRequirementParams( endpointRequirements, reqParams );
	requirementsByEndpoint[ endpoint ] = endpointRequirements;
}

function addQueryEndpointRequirementParams( requirementsByEndpoint, reqParams, endpoint, params ) {
	const endpointRequirements = requirementsByEndpoint[ endpoint ] || {};
	const queries = endpointRequirements.queries || [];
	const queryIndex = findIndex( queries, { params } );
	const queryRequirements = -1 === queryIndex ? { params, ...DEFAULTS } : queries[ queryIndex ];
	const newIndex = -1 === queryIndex ? queries.length : queryIndex;

	addRequirementParams( queryRequirements, reqParams );

	queries[ newIndex ] = queryRequirements;
	endpointRequirements.queries = queries;
	requirementsByEndpoint[ endpoint ] = endpointRequirements;
}

/**
 * Merges new requirement parameters into existing ones.
 * @param {Object} endpointRequirements Contains requirement parameters, possibly endpoints, and queries.
 * @param {Object} reqParams New requirement parameters (freshness, timeout), to be merged with existing ones.
 */
export function addRequirementParams( endpointRequirements, reqParams ) {
	const freshness = endpointRequirements.freshness || DEFAULTS.freshness;
	const timeout = endpointRequirements.timeout || DEFAULTS.timeout;
	const newFreshness = reqParams.freshness || Number.MAX_SAFE_INTEGER;
	const newTimeout = reqParams.timeout || Number.MAX_SAFE_INTEGER;

	endpointRequirements.freshness = Math.min( freshness, newFreshness );
	endpointRequirements.timeout = Math.min( timeout, newTimeout );
}

