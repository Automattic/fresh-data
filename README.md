# Fresh Data

Fresh Data is a declarative data API framework for JavaScript apps.

Fresh Data isn't an API. It's *your* API made easier to use!
It offers a single integration point between APIs and your application.
The application simply declares the data it needs and the Fresh APIs ensure that the data it receives stays fresh.

[![Build Status](https://travis-ci.org/Automattic/fresh-data.svg?branch=master)](https://travis-ci.org/Automattic/fresh-data)
[![Test Coverage](https://img.shields.io/codecov/c/github/Automattic/fresh-data.svg)](https://travis-ci.org/Automattic/fresh-data)

## Caveat

Fresh Data is new. Very new. As such it should *not* be used in production just yet! This code will be changing still.

Try it out on something noncritical and provide some feedback!

## Installation

```sh
npm install --save @fresh-data/framework
```

## Benefits

* Keep data in your web application current, without writing any application code to do it.
* Avoid fetching data that you already have in browser state.
* Works with any way data can be fetched (REST, GraphQL, WebSockets, Offline, etc.)
* Automatically clear out old data that hasn't been used for a while (coming soon)

## How it works

1. Applications declare the data they need and how they need it.
2. APIs define the way data is stored and accessed.

There is support for [React](https://github.com/facebook/react) applications using [Redux](https://github.com/reduxjs/redux) for an internal cache available from `@fresh-data/react-redux`

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

export default withApiClient( { mapSelectorsToProps } )( MyReactComponent );
```

The `withApiClient` Higher Order Component works much like `connect` from [React Redux](https://github.com/reduxjs/react-redux).
The above code will handle the initial fetching of your data and will re-fetch every time the freshness time is exceeded.

## Creating a Fresh Data API Module

Each API Specification can be kept in your application or a separate module.

```js
import { compact, startsWith } from 'lodash';

const URL_ROOT = 'http://example.com/';

const get( endpointPath, params ) => {
	const uri = URL_ROOT + endpointPath.join( '/' );
	const queryString = qs.stringify( params );
	return fetch( `${ uri }?${ query }` );
}

const put( endpointPath, params ) => {
	const uri = URL_ROOT + endpointPath.join( '/' );
	const { data } = params;
	return fetch( uri, { method: 'PUT', body: JSON.stringify( data ) } );
}

const apiSpec = {
	operations: {
		read: ( resourceNames ) => {
			return compact( resourceNames.map( resourceName => {
				if ( startsWith( resourceName, 'thing:' ) ) {
					const thingNumber = resourceName.substr( resourceName.indexOf( ':' ) + 1 );

					const request = get( [ 'things' ] ).then( responseData => {
						return { [ resourceName ]: { data: responseData } };
					} );
					return request;
				}
			} ) );
		},
		update: ( resourceNames, resourceData ) => {
			return compact( resourceNames.map( resourceName => {
				if ( startsWith( resourceName, 'thing:' ) ) {
					const thingNumber = resourceName.substr( resourceName.indexOf( ':' ) + 1 );
					const data = resourceData[ resourceName ];

					const request = put( [ 'things' ], { data } ).then( responseData => {
						return { [ resourceName ]: { data: responseData } };
					} );
					return request;
				}
			} ) );
		}
	},
	mutations: {
		updateThing: ( operations ) => ( thingId, data ) => {
			const resourceName = `thing:${ thingId }`;
			const resourceNames = [ resourceName ];
			const resourceData = { [ resourceName ]: data };
			return operations.update( resourceNames, resourceData );
		}
	},
	selectors: {
		getThing: ( getResource, requireResource ) => ( requirement, thingId ) => {
			const resourceName = `thing:${ thingId }`;
			return requireResource( requirement, resourceName );
		}
	}
};

export apiSpec;
```

Your own API depends on the operations, methods, and selectors you define.
- Operations: The operations you can perform on your data (e.g. read, update, create, delete )
- Mutations: Functions you provide to application developers can call to perform operations on your data.
- Selectors: Functions you provide to application developers to access data in their preferred format.

## Integrating Fresh Data APIs into your React application

The Fresh Data ApiProvider holds a created API Spec available to your application and provides it to your connected data components:

```js
import apiSpec from 'my-api-spec';

export default MyApp = () => {
	return (
		<ReduxProvider store={ store }>
			<FreshDataProvider apiSpec={ apiSpec }>
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

Copyright 2018 Automattic, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
