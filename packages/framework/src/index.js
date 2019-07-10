/**
 * This is the public API of Fresh Data.
 * Below are the parts that can be used within your own application
 * in order to use Fresh Data with your own APIs.
 */

import * as actions from './state/actions';

// Instantiate an ApiClient with a given apiSpec.
export { default as ApiClient } from './client/index';

// Export the reducer and actions so the provider can use them.
// TODO: Close the loop on this and see if we can remove the export.
export { default as reducer } from './state/reducer';
export { actions };

// Use these to express requirement times like freshness and timeout.
export { HOUR, MINUTE, SECOND } from './utils/constants';
