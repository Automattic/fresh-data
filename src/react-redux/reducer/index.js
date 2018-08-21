import apiClientReducer from './apiclient-reducer';

const _defaultState = {
};

const _subReducers = [
	apiClientReducer,
];

export default function reducer( state = _defaultState, action, subReducers = _subReducers ) {
	const { apiName } = action;

	if ( apiName ) {
		const newApiState = subReducers.reduce( ( apiState, subReducer ) => {
			return subReducer( apiState, action );
		}, state[ apiName ] || {} );

		const newState = { ...state, [ apiName ]: newApiState };
		return newState;
	}
	return state;
}
