import apiClientReducer from './apiclient-reducer';

const _defaultState = {
};

const _subReducers = [
	apiClientReducer,
];

export default function reducer( state = _defaultState, action, subReducers = _subReducers ) {
	const { apiName, clientKey } = action;

	if ( apiName && clientKey ) {
		const apiState = state[ apiName ] || {};

		const newClientState = subReducers.reduce( ( clientState, subReducer ) => {
			return subReducer( clientState, action );
		}, apiState[ clientKey ] );

		const newApiState = { ...apiState, [ clientKey ]: newClientState };
		const newState = { ...state, [ apiName ]: newApiState };
		return newState;
	}
	return state;
}
