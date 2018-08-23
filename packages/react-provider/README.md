# Fresh Data for React/Redux

Fresh Data is a declarative data API framework for JavaScript apps.

[![Build Status](https://travis-ci.org/Automattic/fresh-data.svg?branch=master)](https://travis-ci.org/Automattic/fresh-data)
[![Test Coverage](https://img.shields.io/codecov/c/github/Automattic/fresh-data.svg)](https://travis-ci.org/Automattic/fresh-data)

## Caveat

Fresh Data is new. Very new. As such it should *not* be used in production just yet! This code will be changing still.

Try it out on something noncritical and provide some feedback!

## Installation

```sh
npm install --save @fresh-data/react-redux
```

Note: This module has a peer dependency on `@fresh-data/framework` and must be used in conjunction with it.

## How it works

This module is designed to be used with `@fresh-data/framework` and your own API Specification. It takes the API Spec and makes it available to your React application components in an easy and declarative manner.

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
