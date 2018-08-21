import { combineReducers } from 'redux';
import { reducer as freshData } from '@fresh-data/react-provider';

const reducers = {
	freshData,
};

export default combineReducers( reducers );
