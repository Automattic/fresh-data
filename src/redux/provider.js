import { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { get } from 'lodash';

class FreshDataReduxProvider extends Component {
	static propTypes = {
		children: PropTypes.node.isRequired,
		rootPath: PropTypes.oneOfType( [
			PropTypes.arrayOf( PropTypes.oneOfType( [ PropTypes.string, PropTypes.number ] ) ),
			PropTypes.string,
		] ),
		update: PropTypes.func,
	};

	static defaultProps = {
		rootPath: [ 'freshData' ],
		update: () => {}, // TODO: Hook in to registry module by default.
	};

	componentDidMount() {
		const { rootData, update } = this.props;
		update( rootData );
	}

	componentDidUpdate() {
		const { rootData, update } = this.props;
		update( rootData );
	}

	render() {
		return this.props.children;
	}
}

function mapStateToProps( state, ownProps ) {
	const { rootPath } = ownProps;
	const rootData = get( state, rootPath );

	return { rootData };
}

export default connect( mapStateToProps )( FreshDataReduxProvider );
