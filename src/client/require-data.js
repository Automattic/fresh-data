
export default ( componentRequirements ) => ( requirement, endpointPath, params ) => {
	// TODO: Rename endpoint to endpointPath in requirementsByComponent.
	componentRequirements.push( { ...requirement, endpoint: endpointPath, params } );
	return componentRequirements;
};
