import debugFactory from 'debug';
import { createElement, Component } from 'react';
import PropTypes from 'prop-types';

const debug = debugFactory( 'fresh-data:with-api-client' );

export default function withApiClient( apiName, options ) {
	const { mapSelectorsToProps, mapMutationsToProps } = options;

	return function connectWithApiClient( WrappedComponent ) {
		if ( typeof WrappedComponent !== 'function' ) {
			debug(
				'Expected component for function returned by withApiClient',
				'Instead received ', WrappedComponent
			);
			return null;
		}

		const displayName = WrappedComponent.displayName || WrappedComponent.name;

		class ApiClientConnect extends Component {
			static displayName = `ApiClientConnect( ${ displayName } )`;
			static propTypes = WrappedComponent.propTypes;
			static contextTypes = {
				...WrappedComponent.contextTypes,
				getApiClient: PropTypes.func,
			};
			static childContextTypes = WrappedComponent.childContextTypes;
			static WrappedComponent = WrappedComponent;

			state = { client: null, clientState: null };

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
				const { client } = this.state;
				if ( client ) {
					client.unsubscribe( this.handleSubscriptionChange );
					client.setComponentData( this );
				}
			}

			updateClient = ( nextProps, prevState ) => {
				const { getApiClient } = this.context;

				if ( ! getApiClient ) {
					debug(
						'getApiClient not found in context. ' +
						'Ensure this component is a child of the ApiProvider component.'
					);
					return;
				}

				const client = getApiClient();
				if ( client !== prevState.client ) {
					const clientState = client.state;
					client.subscribe( this.handleSubscriptionChange );
					this.setState( () => {
						return { client, clientState };
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

			calculateDerivedProps = () => {
				const { client } = this.state;
				let selectorProps = {};
				let mutationProps = {};

				if ( client ) {
					if ( mapSelectorsToProps ) {
						client.setComponentData(
							this,
							( selectors ) => {
								selectorProps = mapSelectorsToProps( selectors, this.props );
							}
						);
					}

					if ( mapMutationsToProps ) {
						const mutations = client.getMutations();
						mutationProps = mapMutationsToProps( mutations, this.props );
					}
				}

				return {
					...selectorProps,
					...mutationProps,
				};
			}

			render() {
				const derivedProps = this.calculateDerivedProps();
				return createElement( WrappedComponent, { ...this.props, ...derivedProps } );
			}
		}

		return ApiClientConnect;
	};
}
