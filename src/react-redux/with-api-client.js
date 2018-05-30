import debugFactory from 'debug';
import { createElement, Component } from 'react';
import PropTypes from 'prop-types';

const debug = debugFactory( 'fresh-data:with-api-client' );

export default function withApiClient( apiName, mapApiToProps, getClientKey ) {
	return function connectWithApiClient( WrappedComponent ) {
		if ( typeof WrappedComponent !== 'function' ) {
			debug(
				'Expected component for function returned by withApiClient',
				'Instead received ', WrappedComponent
			);
		}

		const displayName = WrappedComponent.displayName || WrappedComponent.name || 'component';

		class ApiClientConnect extends Component {
			static displayName = `ApiClientConnect( ${ displayName } )`;
			static propTypes = WrappedComponent.propTypes;
			static contextTypes = {
				...WrappedComponent.contextTypes,
				getApiClient: PropTypes.func,
			};
			static childContextTypes = WrappedComponent.childContextTypes;
			static WrappedComponent = WrappedComponent;

			state = { clientKey: null, client: null, clientState: null };

			componentDidMount() {
				this.updateClient( this.props, this.state );
			}

			componentDidUpdate( prevProps, prevState ) {
				if ( this.state.client !== prevState.client && prevState.client ) {
					prevState.client.unsubscribe( this.handleSubscriptionChange );
				}

				this.updateClient( this.props, this.state );
			}

			componentWillUnmount() {
				this.state.client.unsubscribe( this.handleSubscriptionChange );
			}

			updateClient = ( nextProps, prevState ) => {
				const clientKey = getClientKey( nextProps );
				if ( clientKey !== prevState.clientKey ) {
					const { getApiClient } = this.context;

					if ( ! getApiClient ) {
						debug(
							'getApiClient not found in context. ' +
							'Ensure this component is a child of the FreshDataProvider component.'
						);
						return;
					}

					const client = getApiClient( apiName, clientKey );
					client.subscribe( this.handleSubscriptionChange );
					this.setState( () => {
						return { clientKey, client };
					} );
				}
			}

			handleSubscriptionChange = ( client ) => {
				this.setState( ( state ) => {
					if ( client === state.client ) {
						// This is our client, set the state.
						return {
							clientState: client.state,
						};
					}
				} );
			}

			render() {
				const { client } = this.state;
				let apiProps = {};

				if ( client ) {
					client.setComponentData(
						this,
						( selectors ) => {
							apiProps = mapApiToProps( selectors, this.props );
						}
					);
				}

				const wrappedProps = {
					...this.props,
					...apiProps,
				};
				return createElement( WrappedComponent, wrappedProps );
			}
		}

		return ApiClientConnect;
	};
}
