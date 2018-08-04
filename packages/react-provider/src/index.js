/**
 * This is the public API of Fresh Data.
 * Below are the parts that can be used within your own application
 * in order to use Fresh Data with your own APIs.
 */

// Combine this in your top-level Redux reducer under 'freshData'.
export { default as reducer } from './reducer/index';

// Children of the ApiProvider can access API data from context.
export { default as ApiProvider } from './provider';

// Use this within FreshDataProvider to wrap your component with api state.
export { default as withApiClient } from './with-api-client';
