import { isUndefined } from 'lodash';
import { SECOND } from '../utils/constants';

export const DEFAULTS = {
	freshness: Number.MAX_SAFE_INTEGER,
	timeout: 20 * SECOND,
};

export function reduceComponentRequirements( requirementsByEndpoint, requirementsByComponent ) {
	let requirements = requirementsByEndpoint;
	requirementsByComponent.forEach( ( componentRequirements ) => {
		Object.keys( componentRequirements ).forEach( ( endpointName ) => {
			const existingEndpointRequirements = requirements[ endpointName ] || [];
			const endpointRequirements = reduceEndpointRequirements(
				existingEndpointRequirements,
				componentRequirements[ endpointName ],
			);

			if ( endpointRequirements !== existingEndpointRequirements ) {
				requirements = { ...requirements, [ endpointName ]: endpointRequirements };
			}
		} );
	} );
	return requirements;
}

export function reduceEndpointRequirements( existingEndpointRequirements, newEndpointRequirements ) {
	return Object.keys( newEndpointRequirements ).reduce( ( endpointRequirements, key ) => {
		const existingRequirement = endpointRequirements[ key ];
		const newRequirement = newEndpointRequirements[ key ];
		const requirement = reduceRequirement( existingRequirement, newRequirement );

		if ( requirement !== existingRequirement ) {
			return { ...endpointRequirements, [ key ]: requirement };
		}
		return endpointRequirements;
	}, existingEndpointRequirements );
}

export function reduceRequirement( existingRequirement = DEFAULTS, newRequirement ) {
	const { freshness, timeout } = newRequirement;
	let requirement = existingRequirement;

	requirement = reduceFreshness( requirement, freshness );
	requirement = reduceTimeout( requirement, timeout );
	return requirement;
}

function reduceFreshness( requirement, freshness ) {
	if ( freshness ) {
		if ( isUndefined( requirement.freshness ) || freshness < requirement.freshness ) {
			return { ...requirement, freshness };
		}
	}
	return requirement;
}

// TODO: DRY this with reduceFreshness into one function.
function reduceTimeout( requirement, timeout ) {
	if ( timeout ) {
		if ( isUndefined( requirement.timeout ) || timeout < requirement.timeout ) {
			return { ...requirement, timeout };
		}
	}
	return requirement;
}
