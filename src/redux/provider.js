import { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

class FreshDataReduxProvider extends Component {
	static propTypes = {
		children: PropTypes.node.isRequired,
	};

	render() {
		return this.props.children;
	}
}

function mapStateToProps() {
	// TODO: Add api state here.
	return {};
}

export default connect( mapStateToProps )( FreshDataReduxProvider );
