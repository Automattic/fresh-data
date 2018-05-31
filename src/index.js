/**
 * This is the public API of Fresh Data.
 * Below are the parts that can be used within your own application
 * in order to use Fresh Data with your own APIs.
 */

// Subclass this to create your own API.
export { default as FreshDataApi } from './api';

// Combine this in your top-level Redux reducer under 'freshData'.
export { default as reducer } from './react-redux/reducer';

// Add this component as a child of your Redux provider.
export { default as FreshDataProvider } from './react-redux/provider';

// Use this within FreshDataProvider to wrap your component with api state.
export { default as withApiClient } from './react-redux/with-api-client';

// Use these to express requirement times like freshness and timeout.
export { HOUR, MINUTE, SECOND } from './utils/constants';
