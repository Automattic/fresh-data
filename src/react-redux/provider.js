import { Component } from 'react';
import { connect } from 'react-redux';
import debugFactory from 'debug';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import * as actions from './actions';

const debug = debugFactory( 'fresh-data:provider' );

export class FreshDataReduxProvider extends Component {
	static propTypes = {
		children: PropTypes.node.isRequired,
		apis: PropTypes.object.isRequired,
		rootPath: PropTypes.oneOfType( [
			PropTypes.arrayOf( PropTypes.oneOfType( [ PropTypes.string, PropTypes.number ] ) ),
			PropTypes.string,
		] ),
		rootData: PropTypes.object.isRequired,
		dataRequested: PropTypes.func.isRequired,
		dataReceived: PropTypes.func.isRequired,
		errorReceived: PropTypes.func.isRequired,
	};

	static defaultProps = {
		rootPath: [ 'freshData' ],
	};

	static childContextTypes = {
		getApiClient: PropTypes.func.isRequired,
	};

	constructor() {
		super( ...arguments );
		this.apisByName = new Map();
		this.namesByApi = new Map();
		this.update();
	}

	getChildContext() {
		return { getApiClient: this.getApiClient };
	}

	componentDidMount() {
		this.update();
	}

	componentDidUpdate() {
		this.update();
	}

	shouldComponentUpdate( nextProps ) {
		const { apis, rootData } = nextProps;
		return ( this.lastApis !== apis || this.lastState !== rootData );
	}

	update() {
		const { apis, rootData } = this.props;
		const apisChanged = this.lastApis !== apis;
		const stateChanged = this.lastState !== rootData;

		if ( apisChanged ) {
			this.updateApis( apis );
			this.lastApis = apis;
		}

		if ( stateChanged || apisChanged ) {
			this.updateState( rootData );
			this.lastState = rootData;
		}
	}

	updateApis = ( apis ) => {
		const { dataRequested, dataReceived, errorReceived } = this;
		debug( 'Setting apis: ', apis );
		this.apisByName.clear();
		this.namesByApi.clear();
		Object.keys( apis ).forEach(
			( apiName ) => {
				const api = apis[ apiName ];
				api.setDataHandlers( dataRequested, dataReceived, errorReceived );
				this.apisByName.set( apiName, api );
				this.namesByApi.set( api, apiName );
			}
		);
	}

	updateState = ( state ) => {
		debug( 'Updating api state: ', state );
		this.apisByName.forEach( ( api, name ) => {
			const apiState = state[ name ] || {};
			api.updateState( apiState );
		} );
	}

	getApiClient = ( apiName, clientKey ) => {
		const api = this.apisByName.get( apiName );
		if ( ! api ) {
			debug( 'Failed to find api by name: ', apiName );
			return null;
		}
		return api.getClient( clientKey );
	}

	dataRequested = ( api, clientKey, resourceName ) => {
		const apiName = this.namesByApi.get( api );
		this.props.dataRequested( apiName, clientKey, resourceName );
	};

	dataReceived = ( api, clientKey, resourceName, data ) => {
		const apiName = this.namesByApi.get( api );
		this.props.dataReceived( apiName, clientKey, resourceName, data );
	};

	errorReceived = ( api, clientKey, resourceName, error ) => {
		const apiName = this.namesByApi.get( api );
		this.props.errorReceived( apiName, clientKey, resourceName, error );
	};

	render() {
		return this.props.children;
	}
}

export function mapStateToProps( state, ownProps ) {
	const { rootPath } = ownProps;
	const rootData = get( state, rootPath, {} );
	return { rootData };
}

const ConnectedFreshDataReduxProvider = connect( mapStateToProps, actions )( FreshDataReduxProvider );

// Ensure the defaults props are assigned the first time mapStateToProps() is run.
ConnectedFreshDataReduxProvider.defaultProps = FreshDataReduxProvider.defaultProps;

export default ConnectedFreshDataReduxProvider;
