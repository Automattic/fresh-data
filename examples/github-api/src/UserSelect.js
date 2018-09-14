import React from 'react';
import PropTypes from 'prop-types';
import { ApiProvider } from '@fresh-data/react-provider';
import restApi from './api-spec/github-rest-api';

const apiName = 'GitHub-REST';
const apiSpec = restApi;

class UserSelect extends React.PureComponent {
	constructor() {
		super( ...arguments );
		this.state = {
			userName: '',
		};
	}

	handleSubmit = ( event ) => {
		const { userName } = this.state;
		if ( userName ) {
			this.setState( { isSubmitted: true } );
		}
		event.preventDefault();
	}

	handleChange = ( event ) => {
		const userName = event.target.value.trim();
		this.setState( { userName, isSubmitted: false } );
	}

	render() {
		const { isSubmitted, userName } = this.state;

		return (
			<ApiProvider apiName={ apiName } apiSpec={ apiSpec }>
				<div className="user-select">
					<form onSubmit={ this.handleSubmit }>
						<label htmlFor="userName">
							Enter user name:
							<input
								id="userName"
								type="text"
								value={ userName }
								onChange={ this.handleChange }
							/>
						</label>
						<button type="submit">Go!</button>
					</form>
					{ isSubmitted && this.props.children( userName ) }
				</div>
			</ApiProvider>
		);
	}
}

UserSelect.propTypes = {
	children: PropTypes.func.isRequired,
};

export default UserSelect;
