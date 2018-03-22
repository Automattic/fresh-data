# fresh-data

`fresh-data` works with [React Redux](https://github.com/reactjs/react-redux) to provide
an exceptionally easy way for [React](https://github.com/facebook/react) components to declare
which data they need from any API with a `fresh-data` implementation.

## Using `fresh-data` from a component

The first goal of `fresh-data` is to make using data from APIs super easy to use from React.
Here's how API data can be used from a React component:

```js
function mapApiToProps( apiClient, ownProps, state ) {
	const { stuffId } = ownProps;

	const stuff = apiClient.selectors.getStuffById( stuffId, { freshness: 30 * SECOND } );

	return {
		data,
	};
}

export default withApiClient( mapApiToProps )( MyReactComponent );
```

The `withApiClient` Higher Order Component works much like `react-redux` connect.
The difference is that it maps API data to props directly using special API selectors,
which takes an additional `requirements` parameter. This allows the component developer
to decide how fresh the data is needed to be. (other requirements still to come!)

## Creating a `fresh-data` API

The second objective of `fresh-data` is to make it extremely easy to add a new API to
a React app to be used. This is also created in the most declarative way possible:

```js
// Create API endpoints that use named methods and provide parameters to them.
// Data returned from these endpoints is kept in the corresponding apiClientState.
const endpoints = {
	stuff: {
		fetchByIds: { method: 'get', params: { include: 'ids' } },
	},
};

// Selectors first apply requirements to endpoint data, then return state.
const selectors = {
	getDataById( apiClientState, requireData ) => ( stuffId, requirements ) => {
		requireData( 'stuff', { ids: [ stuffId ] }, requirements );

		const stuff = apiClientState.stuff[ stuffId ];
		return stuff ? stuff.data : null;
	}
};

// Take methods from the application to create the api to be registered.
export default createStuffApi( methods ) {
	return {
		methods,
		endpoints,
		selectors,
	};
}
```

## Registering `fresh-data` APIs in an application

This is the part that ties it all together. It connects APIs to the methods they need,
registers them, and provides them to `withApiData` connected components.

```js
import { Provider } from 'react-redux';
import { ReduxFreshDataProvider, registerApi } from 'fresh-data';
import stuffApi from 'stuff-api';

// API methods (e.g. get/post/put/patch/delete ) are provided by your own app
import apiMethods from './api-methods';
import store from './store';

// Add the stuff api to the fresh-data registry.
registerApi( stuffApi( apiMethods ) );

class App extends Component {
	render() {
		const { children } = this.props;

		return (
			<Provider store={ store }>
				<ReduxFreshDataProvider>
					{ children }
				</ReduxFreshDataProvider>
			</Provider>
		);
	}
}
```
