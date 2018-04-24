export const DEFAULT_NEXT_UPDATE = Number.MAX_SAFE_INTEGER;

export default function calculateUpdates( requirementsByEndpoint, clientState, now = new Date() ) {
	return Object.keys( requirementsByEndpoint ).reduce(
		( updateInfo, endpointName ) => {
			const endpointRequirements = requirementsByEndpoint[ endpointName ];
			const endpointState = clientState[ endpointName ] || {};
			const endpointUpdateInfo = calculateEndpointUpdates(
				endpointRequirements,
				endpointState,
				now
			);
			updateInfo.updates[ endpointName ] = endpointUpdateInfo.updates;
			updateInfo.nextUpdate = Math.min( updateInfo.nextUpdate, endpointUpdateInfo.nextUpdate );
			return updateInfo;
		},
		{ updates: {}, nextUpdate: DEFAULT_NEXT_UPDATE }
	);
}

export function calculateEndpointUpdates(
	endpointRequirements,
	endpointState,
	now = new Date()
) {
	return Object.keys( endpointRequirements ).reduce(
		( updateInfo, paramString ) => {
			const params = JSON.parse( paramString );
			console.log( 'params: ', params );
			const itemRequirements = endpointRequirements[ id ];
			const itemState = endpointState[ id ] || {};
			const itemNextUpdate = calculateNextItemUpdate( itemRequirements, itemState, now );
			if ( itemNextUpdate < 0 ) {
				updateInfo.updates.push( id );
			}
			updateInfo.nextUpdate = Math.min( updateInfo.nextUpdate, itemNextUpdate );
			return updateInfo;
		},
		{ updates: [], nextUpdate: DEFAULT_NEXT_UPDATE },
	);
}

export function calculateNextItemUpdate(
	itemRequirements,
	itemState,
	now = new Date()
) {
	const lastReceived = ( itemState && itemState.lastReceived ) || Number.MIN_SAFE_INTEGER;
	const sinceLastReceived = now - lastReceived;

	const lastRequested = ( itemState && itemState.lastRequested ) || Number.MIN_SAFE_INTEGER;
	const sinceLastRequested = now - lastRequested;
	const isRequesting = ( itemState && itemState.lastRequested ) && lastRequested > lastReceived;

	const freshness = itemRequirements.freshness;
	const freshnessExpiration = freshness ? freshness - sinceLastReceived : Number.MAX_SAFE_INTEGER;

	const timeout = itemRequirements.timeout || Number.MAX_SAFE_INTEGER;
	const timeoutExpiration = isRequesting ? timeout - sinceLastRequested : Number.MAX_SAFE_INTEGER;

	return Math.min( freshnessExpiration, timeoutExpiration );
}
