import React from 'react';
import PropTypes from 'prop-types';

class UserSelect extends React.Component {
	constructor() {
		super( ...arguments );
		this.state = {
			userName: '',
		};
	}

	handleSubmit = ( event ) => {
		const { userName } = this.state;
		if ( userName ) {
			this.setState( () => ( { userName, isSubmitted: true } ) );
		}
		event.preventDefault();
	}

	handleChange = ( event ) => {
		const userName = event.target.value.trim();
		this.setState( () => ( { userName, isSubmitted: false } ) );
	}

	render() {
		const { isSubmitted, userName } = this.state;

		return (
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
		);
	}
}

UserSelect.propTypes = {
	children: PropTypes.func.isRequired,
};

export default UserSelect;
