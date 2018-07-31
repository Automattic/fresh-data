/**
 * This is the public API of Fresh Data.
 * Below are the parts that can be used within your own application
 * in order to use Fresh Data with your own APIs.
 */

// Instantiate an ApiClient with a given apiSpec.
export { default as ApiClient } from './client/index';

// Combine this in your top-level Redux reducer under 'freshData'.
export { default as reducer } from './react-redux/reducer/index';

// Children of the ApiProvider can access API data from context.
export { default as ApiProvider } from './react-redux/provider';

// Use this within FreshDataProvider to wrap your component with api state.
export { default as withApiClient } from './react-redux/with-api-client';

// Use these to express requirement times like freshness and timeout.
export { HOUR, MINUTE, SECOND } from './utils/constants';
