import { SECOND } from '../utils/constants';

export const DEFAULTS = {
	freshness: Number.MAX_SAFE_INTEGER,
	timeout: 20 * SECOND,
};

export function reduceEndpointRequirements( endpointRequirements, ids, newRequirements ) {
	return ids.reduce( ( requirements, id ) => {
		const oldRequirements = endpointRequirements[ id ];
		const itemRequirements = reduceItemRequirements( oldRequirements, newRequirements );
		if ( itemRequirements !== oldRequirements ) {
			return { ...requirements, [ id ]: itemRequirements };
		}
		return requirements;
	}, endpointRequirements );
}

export function reduceItemRequirements( oldRequirements, newRequirements ) {
	const { freshness, timeout } = newRequirements;
	let requirements = oldRequirements;

	if ( freshness < oldRequirements.freshness ) {
		requirements = { ...requirements, freshness };
	}
	if ( timeout < oldRequirements.timeout ) {
		requirements = { ...requirements, timeout };
	}
	return requirements;
}
