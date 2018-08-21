/**
 * This is the public API of Fresh Data.
 * Below are the parts that can be used within your own application
 * in order to use Fresh Data with your own APIs.
 */

// Instantiate an ApiClient with a given apiSpec.
export { default as ApiClient } from './client/index';

// Use these to express requirement times like freshness and timeout.
export { HOUR, MINUTE, SECOND } from './utils/constants';
