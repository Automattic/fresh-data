import { SECOND } from '../utils/constants';

export const DEFAULTS = {
	freshness: Number.MAX_SAFE_INTEGER,
	timeout: 20 * SECOND,
};

/**
 * Combines component requirements into a requirements list by resourceName.
 * @param {Map} requirementsByComponent Key: Component, Value: requirements parameters with resourceName.
 * @return {Object} List of requirements by resource name.
 */
export function combineComponentRequirements( requirementsByComponent ) {
	const requirementsByResource = {};

	requirementsByComponent.forEach( ( requirements ) => {
		requirements.forEach( ( requirement ) => {
			const { resourceName, ...reqParams } = requirement;
			addResourceRequirement( requirementsByResource, reqParams, resourceName );
		} );
	} );
	return requirementsByResource;
}

/**
 * Mutates the state of requirementsByResource by adding requirement parameters to it.
 * @param {Object} requirementsByResource List of requirements keyed by resourceName.
 * @param {Object} reqParams New requirement parameters ( e.g. { freshness: 30 * SECOND } )
 * @param {string} resourceName Name of resource being required.
 */
export function addResourceRequirement( requirementsByResource, reqParams, resourceName ) {
	const requirement = requirementsByResource[ resourceName ] || { ...DEFAULTS };
	addRequirementParams( requirement, reqParams );
	requirementsByResource[ resourceName ] = requirement;
}

/**
 * Merges new requirement parameters into existing ones.
 * @param {Object} requirements Contains requirement parameters.
 * @param {Object} reqParams New requirement parameters (freshness, timeout), to be merged with existing ones.
 */
export function addRequirementParams( requirements, reqParams ) {
	const freshness = requirements.freshness || DEFAULTS.freshness;
	const timeout = requirements.timeout || DEFAULTS.timeout;
	const newFreshness = reqParams.freshness || Number.MAX_SAFE_INTEGER;
	const newTimeout = reqParams.timeout || Number.MAX_SAFE_INTEGER;

	requirements.freshness = Math.min( freshness, newFreshness );
	requirements.timeout = Math.min( timeout, newTimeout );
}
