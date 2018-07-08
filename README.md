# Fresh Data

Fresh Data is a declarative data API framework for JavaScript apps.

It offers a single integration point between APIs and your application.
The application simply declares the data it needs and the Fresh APIs ensure that the data it receives stays fresh.

[![Build Status](https://travis-ci.org/coderkevin/fresh-data.svg?branch=master)](https://travis-ci.org/coderkevin/fresh-data)
[![Test Coverage](https://img.shields.io/codecov/c/github/coderkevin/fresh-data.svg)](https://travis-ci.org/coderkevin/fresh-data)

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

	const thing = getThing( { freshness: 90 * SECOND }, thingId );

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
import { compact, startsWith } from 'lodash';

export default class MyApi extends FreshDataApi {
	static methods = {
		get: ( clientKey ) => ( endpointPath, params ) => {
			const uri = clientKey + endpointPath.join( '/' );
			const queryString = qs.stringify( params );
			return fetch( `${ uri }?${ query }` );
		},
		put: ( clientKey ) => ( endpointPath, params ) => {
			const uri = clientKey + endpointPath.join( '/' );
			const { data } = params;
			return fetch( uri, { method: 'PUT', body: JSON.stringify( data ) } );
		}
	}

	static operations = {
		read: ( methods ) => ( resourceNames ) => {
			return compact( resourceNames.map( resourceName => {
				if ( startsWith( resourceName, 'thing:' ) ) {
					const thingNumber = resourceName.substr( resourceName.indexOf( ':' ) + 1 );

					const request = methods.get( [ 'things' ] ).then( responseData => {
						return { [ resourceName ]: { data: responseData } };
					} );
					return request;
				}
			} ) );
		}
		update: ( methods ) => ( resourceNames, resourceData ) => {
			return compact( resourceNames.map( resourceName => {
				if ( startsWith( resourceName, 'thing:' ) ) {
					const thingNumber = resourceName.substr( resourceName.indexOf( ':' ) + 1 );
					const data = resourceData[ resourceName ];

					const request = methods.put( [ 'things' ], { data } ).then( responseData => {
						return { [ resourceName ]: { data: responseData } };
					} );
					return request;
				}
			} ) );
		}
	}

	static mutations = {
		updateThing: ( operations ) => ( thingId, data ) => {
			const resourceName = `thing:${ thingId }`;
			const resourceNames = [ resourceName ];
			const resourceData = { [ resourceName ]: data };
			return operations.update( resourceNames, resourceData );
		}
	}

	static selectors = {
		getThing: ( getData, requireData ) => ( requirement, thingId ) => {
			const resourceName = `thing:${ thingId }`;
			requireData( requirement, resourceName );
			return getData( resourceName ) || {};
		}
	}
}
```

Your own API depends on the methods, operations, methods, and selectors you define.
- Methods: The way you access your API.
- Operations: The operations you can perform on your data (e.g. read, update, create, delete )
- Mutations: Functions you provide to application developers can call to perform operations on your data.
- Selectors: Functions you provide to application developers to access data in their preferred format.

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
  - GraphQL
  - WebSockets
- Feature: Fetch on first mount (regardless of freshness)
- Feature: Clearing out old data
  - Detecting when data was last rendered
  - Unlinking data over a threshold

## License
GPL v2
