# Fresh Data

Fresh Data is a declarative data API framework for JavaScript apps.

It offers a single integration point between APIs and your application.
The application simply declares the data it needs and the Fresh APIs ensure that the data it receives stays fresh.

## Benefits

* Keep data in your web application current, without writing any application code to do it.
* Avoid fetching data that you already have in browser state.
* Works with any way data can be fetched (REST, GraphQL, WebSockets, Offline, etc.)
* Automatically clear out old data that hasn't been used for a while (coming soon)

## How it works

1. Applications declare the data they need and how they need it.
2. APIs define the way data is stored and accessed.
3. Environments can offer differing methods of network access.

As of now, Fresh Data is geared toward [React](https://github.com/facebook/react) applications and it uses [Redux](https://github.com/reduxjs/redux) to hold state.

## Application Component

Here's how you define the API data you need for a React Component.

```js
function mapSelectorsToProps( selectors, ownProps, state ) {
	const { getThing } = selectors;
	const { thingId } = ownProps;

	const thing = getThing( thingId, { freshness: 90 * SECOND } );

	return {
		thing,
	};
}

function getClientKey( props ) {
	return props.myApiUri
}

export default withApiClient( 'MyApi', { mapSelectorsToProps, getClientKey } )( MyReactComponent );
```

The `withApiClient` Higher Order Component works much like `connect` from [React Redux](https://github.com/reduxjs/react-redux).
The above code will handle the initial fetching of your data and will re-fetch every time the freshness time is exceeded.

## Creating a Fresh Data API Module

Modules for each API can be kept in your application or a separate module.

```js
export default class MyApi extends FreshDataApi {
	static methods = {
		get: ( clientKey ) => ( endpointPath ) => ( params ) => {
			const uri = clientKey + endpointPath.join( '/' );
			const queryString = qs.stringify( params );
			return fetch( `${ uri }?${ query }` );
		}
	}

	static endpoints = {
		things: {
			read: ( methods, endpointPath, params ) => {
				const { get } = methods;
				const fullEndpointPath = [ 'things', ...endpointPath ];
				return get( fullEndpointPath )( params );
			}
		}
	}

	static selectors = {
		getThing: ( getData, requireData ) => ( thingId, requirement ) => {
			const path = [ 'thing', thingId ];
			requireData( requirement, path );
			return getData( path ) || {};
		}
	}
}
```

Your own API depends on the methods, endpoints, and selectors you define.
- Methods: The way you access your API.
- Endpoints: Object context of your API, uses methods for data.
- Selectors: Set requirements and return data from endpoints.

## Integrating Fresh Data APIs into your React application

The FreshDataProvider holds the list of APIs available to your application and provides it to your connected data components:

```js
const apis = { MyApi: new MyApi() };

export default MyApp = () => {
	return (
		<ReduxProvider store={ store }>
			<FreshDataProvider apis={ apis }>
				<div classname="App">
					<DataForm myApiUri="https://example.com" />
				</div>
			</FreshDataProvider>
		</ReduxProvider>
	);
};
```

## Still to be completed

Fresh Data is functional, but still a work in progress. Here's what's next on the list:
- More examples:
  - GitHub API
  - WordPress REST API
  - GraphQL
  - WebSockets
  - Mutating data example (create, update, delete endpoints)
- Feature: Fetch on first mount (regardless of freshness)
- Feature: Clearing out old data
  - Detecting when data was last rendered
  - Unlinking data over a threshold

## License
GPL v2
