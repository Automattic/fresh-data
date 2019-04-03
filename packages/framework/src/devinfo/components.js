/**
 * Generates information about components that require resources.
 * @param {Object} client The client to inspect.
 * @return {Array} An array of objects that describe components and their requirements.
 */
export default function components( client ) {
	const componentSummaries = [];
	client.requirementsByComponent.forEach( ( requirements, component ) => {
		componentSummaries.push( {
			component,
			requirements
		} );
	} );
	return componentSummaries;
}
