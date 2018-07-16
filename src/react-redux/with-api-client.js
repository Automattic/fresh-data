import debugFactory from 'debug';
import { createElement, Component } from 'react';
import PropTypes from 'prop-types';

const debug = debugFactory( 'fresh-data:with-api-client' );

export default function withApiClient( apiName, options ) {
	const { getClientKey, mapSelectorsToProps, mapMutationsToProps } = options;

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

			constructor( props ) {
				super( ...arguments );

				this.clientKey = null;
				this.client = null;
				this.clientState = null;
				this.clientStateChanged = false;

				this.updateClient( props );
			}

			componentDidMount() {
				this.updateClient( this.props );
			}

			componentDidUpdate() {
				this.updateClient( this.props );
			}

			componentWillUnmount() {
				if ( this.client ) {
					this.client.unsubscribe( this.handleSubscriptionChange );
				}
			}

			shouldComponentUpdate( nextProps, nextState ) {
				const propsChanged = nextProps !== this.props;
				const stateChanged = nextState !== this.state;
				return this.clientStateChanged || propsChanged || stateChanged;
			}

			getApiClient = ( clientKey ) => {
				const { getApiClient } = this.context;

				if ( ! getApiClient ) {
					debug(
						'getApiClient not found in context. ' +
						'Ensure this component is a child of the FreshDataProvider component.'
					);
					return null;
				}

				return getApiClient( apiName, clientKey );
			}

			updateClient = ( nextProps ) => {
				const clientKey = getClientKey( nextProps );

				if ( clientKey !== this.clientKey ) {
					if ( this.client ) {
						this.client.unsubscribe( this.handleSubscriptionChange );
						this.clientState = null;
						this.clientStateChanged = true;
					}

					this.clientKey = clientKey;
					this.client = this.getApiClient( clientKey );

					if ( this.client ) {
						this.clientState = this.client.state;
						this.clientStateChanged = true;
						this.client.subscribe( this.handleSubscriptionChange );
					}
				}
			}

			handleSubscriptionChange = ( client ) => {
				if ( client === this.client ) {
					this.clientState = this.client.state;
					// TODO: Check if any of the resourceNames we actually use have changed.
					this.clientStateChanged = true;
				}
			}

			calculateDerivedProps = () => {
				const { client } = this;
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
				this.clientStateChanged = false;
				const derivedProps = this.calculateDerivedProps();
				return createElement( WrappedComponent, { ...this.props, ...derivedProps } );
			}
		}

		return ApiClientConnect;
	};
}
