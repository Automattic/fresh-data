import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { verifySiteUrl, createApi } from './test-wp-rest-api';
import { ApiProvider } from '@fresh-data/framework';

class SiteSelect extends Component {
	static propTypes = {
		children: PropTypes.node.isRequired,
	};

	constructor() {
		super( ...arguments );
		this.state = {
			url: '',
			previousSites: [ 'demo.wp-api.org' ],
		};
		this.clonedChildren = [];
	}

	handleChange = ( event ) => {
		const url = event.target.value.trim();
		this.setState( () => ( { url, isSiteValid: false } ) );
	}

	handleSubmit = ( event ) => {
		this.verifyUrl();
		event.preventDefault();
	}

	verifyUrl = () => {
		const { url, previousSites } = this.state;
		const siteUrl = url.startsWith( 'http' ) ? url : `http://${ url }`;

		if ( -1 !== previousSites.indexOf( url ) ) {
			const ApiClass = createApi( siteUrl );
			const api = new ApiClass();

			// We've seen this site before, don't verify.
			this.setState( () => ( {
				siteUrl,
				api,
				isSiteValid: true,
			} ) );
			return;
		}

		this.setState( () => ( { isVerifyingUrl: true } ) );
		verifySiteUrl( siteUrl ).then( ( isSiteValid ) => {
			const ApiClass = createApi( siteUrl );
			const api = new ApiClass();

			this.setState( () => ( {
				siteUrl,
				api,
				isSiteValid,
				previousSites: [ ...previousSites, url ],
				isVerifyingUrl: false
			} ) );
		} ).catch( ( error ) => {
			console.error( error ); // eslint-disable-line no-console
		} );
	}

	renderChildren() {
		const { api, siteUrl } = this.state;
		const { children } = this.props;
		return (
			<ApiProvider apiName={ 'wp-site' } api={ api }>
				{ React.Children.map( children, child => React.cloneElement( child, { siteUrl } ) ) }
			</ApiProvider>
		);
	}

	renderSiteOption( site, index ) {
		return <option key={ index }>{ site }</option>;
	}

	// TODO: Render an error state when !isSiteValid.
	render() {
		const { url, previousSites, isSiteValid } = this.state;

		return (
			<div className="site-select">
				<form onSubmit={ this.handleSubmit }>
					<label htmlFor="siteSelect">
						Enter Site URL:
						<input
							type="text"
							id="siteSelect"
							name="siteSelect"
							list="previousSites"
							value={ url }
							onChange={ this.handleChange }
						/>
					</label>
					<datalist id="previousSites">
						{ previousSites && previousSites.map( this.renderSiteOption ) }
					</datalist>
					<button type="submit">Go!</button>
				</form>
				{ isSiteValid && this.renderChildren() }
			</div>
		);
	}
}

export default SiteSelect;
