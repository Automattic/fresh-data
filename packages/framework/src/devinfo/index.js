const devInfo = {};

/**
 * Checks if devInfo is enabled and available.
 * @return {boolean} True if dev info is enabled, false if not.
 */
export function isDevInfoEnabled() {
	return ( true === window.__FRESH_DATA_DEV_INFO__ );
}

/**
 * Called by the ApiClient class to update the dev info data.
 * This is called when the client state or requirements change.
 * @param {Object} client The client which has been updated.
 */
export function updateDevInfo( client ) {
	if ( isDevInfoEnabled() ) {
		devInfo[ client.getName() ] = generateDevInfo( client );
		setDevInfoGlobal();
	}
}

/**
 * Generates the devInfo object for a given client.
 * @param {Object} client The client for which the info is generated.
 * @return {Object} A devInfo object with summary, resources, and components.
 */
function generateDevInfo( client ) {
	const info = {
		// TODO: Re-add info based on scheduler data.
		name: client.getName(),
	};

	return info;
}

/**
 * Sets the dev info to the global window context.
 * This is so it can be referenced by the JavaScript console in the browser.
 */
function setDevInfoGlobal() {
	if ( ! window.freshData ) {
		window.freshData = devInfo;
	}
}
