import { Component } from 'react';
import { connect } from 'react-redux';
import debugFactory from 'debug';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import * as actions from './actions';

const debug = debugFactory( 'fresh-data:api-provider' );

export class ApiProvider extends Component {
	static propTypes = {
		children: PropTypes.node,
		apiName: PropTypes.string.isRequired,
		api: PropTypes.object.isRequired,
		rootPath: PropTypes.oneOfType( [
			PropTypes.arrayOf( PropTypes.oneOfType( [ PropTypes.string, PropTypes.number ] ) ),
			PropTypes.string,
		] ),
		rootData: PropTypes.object.isRequired,
		dataRequested: PropTypes.func.isRequired,
		dataReceived: PropTypes.func.isRequired,
	};

	static defaultProps = {
		rootPath: [ 'freshData' ],
	};

	static childContextTypes = {
		getApiClient: PropTypes.func.isRequired,
	};

	constructor( props ) {
		super( ...arguments );
		this.update( props );
	}

	getChildContext() {
		return { getApiClient: this.getApiClient };
	}

	componentDidMount() {
		this.update( this.props );
	}

	componentDidUpdate() {
		this.update( this.props );
	}

	shouldComponentUpdate( nextProps ) {
		const { api, rootData } = nextProps;
		return ( this.lastApi !== api || this.lastRootData !== rootData );
	}

	update( props ) {
		const { dataRequested, dataReceived } = this;
		const { apiName, api, rootData } = props;
		const apiChanged = api && this.lastApi !== api;
		const stateChanged = api && this.lastRootData !== rootData;

		if ( apiChanged ) {
			debug( 'Updating api: ', api );
			api.setDataHandlers( { dataRequested, dataReceived } );
			this.lastApi = api;
		}

		if ( stateChanged || apiChanged ) {
			debug( 'Updating root data: ', rootData );
			api.updateState( rootData[ apiName ] || {} );
			this.lastRootData = rootData;
		}
	}

	getApiClient = () => {
		const { api } = this.props;
		if ( ! api ) {
			debug( 'No api prop set' );
			return undefined;
		}
		return api.getClient();
	}

	dataRequested = ( resourceNames ) => {
		const { apiName } = this.props;
		const { dataRequested } = this.props;
		dataRequested( apiName, resourceNames );
	}

	dataReceived = ( resources ) => {
		const { apiName } = this.props;
		const { dataReceived } = this.props;
		dataReceived( apiName, resources );
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

const ConnectedApiProvider = connect( mapStateToProps, actions )( ApiProvider );

// Ensure the defaults props are assigned the first time mapStateToProps() is run.
ConnectedApiProvider.defaultProps = ApiProvider.defaultProps;

export default ConnectedApiProvider;
