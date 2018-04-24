import invariant from 'invariant';
import { isFunction } from 'lodash';
import { Component, createElement } from 'react';
import { connect } from 'react-redux';
import { getApiClient } from '../index';

export default function withApiClient( clientKey, mapApiToProps ) {
	return function connectWithApiClient( WrappedComponent ) {
		invariant(
			typeof WrappedComponent == 'function',
			'You must pass a component to the function returned by withApiClient.' +
			`Instead received ${ JSON.stringify( WrappedComponent ) }`
		);

		// Manage the apiClient for the WrappedComponent and pass it down as a prop.
		class ApiClientConnect extends Component {
			constructor( props ) {
				super( ...arguments );
				this.updateClient( props );

				// Create a connected wrapped component that can select data from the apiClient.
				const mapStateToProps = ( state, ownProps ) => {
					const { apiClient } = ownProps;
					const apiProps = apiClient.selectComponentData( this, state, ( selectors ) => {
						return mapApiToProps( selectors, ownProps, state );
					} );

					return apiProps;
				};
				this.ConnectedWrappedComponent = connect( mapStateToProps )( WrappedComponent );
			}

			componentDidMount() {
				this.updateClient( this.props );
			}

			componentWillReceiveProps( nextProps ) {
				this.updateClient( nextProps );
			}

			componentWillUnmount() {
				this.updateClient( {} );
			}

			updateClient( props ) {
				const key = isFunction( clientKey ) ? clientKey( props ) : clientKey;

				if ( this.key !== key ) {
					const nextClient = getApiClient( key );

					// Clear our requirements from a client if we're no longer using it.
					if ( this.client && this.client !== nextClient ) {
						this.client.clearComponentRequirements( this );
					}

					this.client = nextClient;
					this.key = key;
					this.clientChanged = true;
				}
			}

			shouldComponentUpdate() {
				const needsUpdate = this.clientChanged;
				this.clientChanged = false;
				return needsUpdate;
			}

			render() {
				const wrappedProps = {
					...this.props,
					apiClient: this.client,
				};
				return createElement( this.ConnectedWrappedComponent, wrappedProps );
			}
		}

		const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

		ApiClientConnect.WrappedComponent = WrappedComponent;
		ApiClientConnect.displayName = `ApiClientConnect(${ displayName })`;
		ApiClientConnect.contextTypes = WrappedComponent.contextTypes;
		ApiClientConnect.childContextTypes = WrappedComponent.childContextTypes;
		ApiClientConnect.propTypes = WrappedComponent.propTypes;

		return ApiClientConnect;
	};
}
