
const endpoints = {
	// TODO: Add endpoints.
};

const selectors = {
	getNoun: ( apiClientState, requireData ) => ( requirements ) => {
		requireData( requirements, 'noun' );

		const noun = apiClientState.noun;
		return noun ? noun.data : null;
	},
};

export default function createTestApi( methods ) {
	return {
		name: 'test-api',
		methods,
		endpoints,
		selectors,
	};
}
