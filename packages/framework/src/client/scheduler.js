import debugFactory from 'debug';
import { find, groupBy, isArray, isEmpty, isEqual, isNil, uniq } from 'lodash';
import ResourceRequest, { STATUS } from './resource-request';

const debug = debugFactory( 'fresh-data:scheduler' );

export default class Scheduler {
	/**
	 * Creates a new Scheduler
	 * @param {Object} operations The mapping of operation names to functions
	 * @param {function} setTimeout The function to set a time (defaults to window.setTimeout)
	 * @param {function} clearTimeout The function to clear a timer by id (defaults to window.setTimeout)
	 */
	constructor(
		operations,
		setTimeout = window.setTimeout.bind( window ),
		clearTimeout = window.clearTimeout.bind( window ),
	) {
		this.debug = debugFactory( 'fresh-data:scheduler' );

		this.operations = operations;
		this.requests = [];
		this.setTimeout = setTimeout;
		this.clearTimeout = clearTimeout;
		this.timeoutId = null;

		this.dataRequested = () => this.debug( 'warning: dataRequested called before setDataHandlers' );
		this.dataReceived = () => this.debug( 'warning: dataReceived called before setDataHandlers' );
	}

	/**
	 * Cancels the processing of requests.
	 */
	stop = () => {
		if ( null !== this.timeoutId ) {
			debug( 'Cancelling next update.' );
			this.clearTimeout( this.timeoutId );
			this.timeoutId = null;
		}
	};

	/**
	 * (Re)schedules next run of request processing, based on the current collection of requests.
	 * Note: Only reschedules if necessary.
	 * @param {Date} now The current time
	 */
	updateDelay = ( now = new Date() ) => {
		if ( null !== this.timeoutId ) {
			this.clearTimeout( this.timeoutId );
			this.timeoutId = null;
		}

		const nextDelay = this.getNextRequestDelay( now );

		if ( null !== nextDelay ) {
			debug( `Scheduling next update for ${ nextDelay / 1000 } seconds from now.` );
			this.timeoutId = this.setTimeout( this.processRequests, nextDelay );
		}
	};

	/**
	 * Processes the current collection of requests.
	 * No need to call this directly, it is called by the internal timer.
	 */
	processRequests = () => {
		this.cleanUp();
		this.resendTimeouts();
		this.sendReadyRequests();
		this.updateDelay();
	};

	/**
	 * Gets the next time a request is due to be sent.
	 * @param {Date} now The current time
	 * @return {number|null} The millisecond delay until the next request is due, or null if no requests are due.
	 */
	getNextRequestDelay = ( now = new Date() ) => {
		let delay = null;

		this.requests.forEach( ( request ) => {
			const status = request.getStatus( now );
			if ( STATUS.overdue === status ) {
				delay = 0;
			} else if ( STATUS.scheduled === status ) {
				delay = Math.min( delay || Number.MAX_VALUE, request.getTimeLeft() );
				delay = Math.max( delay, 0 ); // Ensure we never send a negative delay
			}
		} );

		return delay;
	};

	/**
	 * Sets the data handlers for the scheduler.
	 * @param {Function} dataRequested The dispatch-wrapped function for the data requested action.
	 * @param {Function} dataReceived The dispatch-wrapped function for the data received action.
	 */
	setDataHandlers = ( dataRequested, dataReceived ) => {
		this.dataRequested = dataRequested;
		this.dataReceived = dataReceived;
	};

	/**
	 * Finds a request that is either scheduled or overdue.
	 * @param {string} resourceName The name of the resource for the operation
	 * @param {string} operation The name of the operation to be performed
	 * @param {Date} now The current time.
	 * @return {ResourceRequest} The scheduled request, or null if none found
	 */
	getScheduledRequest = ( resourceName, operation, now = new Date() ) => {
		return find( this.requests, ( r ) => {
			const status = r.getStatus( now );
			return (
				resourceName === r.resourceName &&
				operation === r.operation &&
				( STATUS.scheduled === status || STATUS.overdue === status )
			);
		} );
	};

	/**
	 * Finds requests that are in flight by resourceName
	 * @param {string} resourceName The name of the resource to check
	 * @param {string} operation The name of the operation to be performed
	 * @param {Date} now The current time.
	 * @return {Array} Any requests for the given resource which are currently in flight.
	 */
	getInFlightRequests = ( resourceName, operation, now = new Date() ) => {
		return this.requests.filter( ( r ) => {
			return (
				resourceName === r.resourceName &&
				operation === r.operation &&
				STATUS.inFlight === r.getStatus( now )
			);
		} );
	};

	/**
	 * Schedule a operation on a resource name according to the requirement set given.
	 * @param {Object} requirement The set of requirements (freshness, timeout)
	 * @param {Object} resourceState The current snapshot of resource state
	 * @param {string} resourceName The name of the resource for the operation
	 * @param {string} operation The name of the operation to be performed
	 * @param {Object} data The data to be sent for the operation (defaults to undefined)
	 * @param {Date} now The current time.
	 */
	scheduleRequest = (
		requirement,
		resourceState,
		resourceName,
		operation,
		data = undefined,
		now = new Date()
	) => {
		const identicalInFlightRequest = find(
			this.getInFlightRequests( resourceName, operation, now ),
			( request ) => {
				return isEqual( request.data, data ) || ( isNil( request.data ) && isNil( data ) );
			}
		);

		if ( identicalInFlightRequest ) {
			// Do nothing, there's already an identical request in flight.
			return;
		}

		const existingRequest = this.getScheduledRequest( resourceName, operation, now );
		if ( existingRequest ) {
			existingRequest.append( requirement, resourceState, data, now );
		} else {
			this.requests.push( new ResourceRequest( requirement, resourceState, resourceName, operation, data, now ) );
		}
		this.updateDelay( now );
	};

	// TODO: Remove this after mutations are updated to no longer use operations directly.
	scheduleMutationOperation = (
		operationName,
		resourceNames,
		resourceData,
		now = new Date()
	) => {
		resourceNames.forEach( ( resourceName ) => {
			const data = resourceData ? resourceData[ resourceName ] : undefined;
			this.scheduleRequest( {}, {}, resourceName, operationName, data, now );
		} );
	}

	/**
	 * Send a specific list of requests.
	 * @param {Array} requests The requests to send.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the operation call.
	 */
	sendRequests = async ( requests, now ) => {
		// Split the requests up by operation, so we can send one of each operation.
		const requestsByOperation = groupBy( requests, 'operation' );
		const promises = [];

		if ( ! isEmpty( requests ) ) {
			this.dataRequested( requests.map( ( request ) => request.resourceName ) );
		}

		Object.keys( requestsByOperation ).forEach( ( operationName ) => {
			// Send one operation, and associate all requests for it
			const operationFunc = this.operations[ operationName ];
			promises.push( sendOperation( operationFunc, requests, this.dataReceived, now ) );
		} );

		// Return a list of operation promises
		return await Promise.all( promises );
	};

	/**
	 * Send any scheduled requests that are ready.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the operation call.
	 */
	sendReadyRequests = ( now = new Date() ) => {
		const readyRequests = this.requests.filter( ( request ) => request.isReady() );
		return this.sendRequests( readyRequests, now );
	};

	/**
	 * Send any scheduled requests that are timed out.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the operation call.
	 */
	resendTimeouts = ( now = new Date() ) => {
		const timedOutRequests = this.requests.filter( ( request ) => {
			return STATUS.timedOut === request.getStatus( now );
		} );
		return this.sendRequests( timedOutRequests, now );
	};

	/**
	 * Clear out completed and failed requests.
	 * @param {Date} now The current time.
	 */
	cleanUp = ( now = new Date() ) => {
		this.requests = this.requests.filter( ( request ) => {
			const status = request.getStatus( now );
			return STATUS.complete !== status && STATUS.failed !== status;
		} );
	};
}

/**
 * Sends an operation for a set of given operation requests
 * @param {Promise} operation The actual operation promise from the apiSpec
 * @param {Array} requests An array of requests for the given operation
 * @param {Function} dataReceived A function to be called when data is received from the operation
 * @param {Date} now The current time
 * @return {Promise} The promise returned from the operation
 */
export async function sendOperation( operation, requests, dataReceived, now ) {
	const resourceNames = uniq( requests.map( request => request.resourceName ) );
	const data = combineRequestData( requests );
	const operationResult = operation( resourceNames, data );
	const operationResultArray = isArray( operationResult ) ? operationResult : [ operationResult ];
	const resourceSets = [];

	const promise = Promise.all( operationResultArray.map( async ( result ) => {
		resourceSets.push( await result );
	} ) ).then( () => {
		requests.forEach( ( request ) => {
			request.requestComplete();
		} );
		resourceSets.forEach( ( resources ) => {
			dataReceived( resources );
		} );
	} ).catch( ( error ) => {
		requests.forEach( ( request ) => {
			request.requestFailed( error );
		} );
		resourceSets.forEach( ( resources ) => dataReceived( resources ) );
	} );

	requests.forEach( ( request ) => {
		request.requested( promise, now );
	} );
	return promise;
}

/**
 * Combines the request data from multiple requests for one operation call
 * @param {Array} requests An array of requests for a given operation call
 * @return {Object} The combined data from the requests, or undefined if none
 */
export function combineRequestData( requests ) {
	const combinedData = requests.reduce( ( data, request ) => {
		if ( data[ request.resourceName ] || request.data ) {
			data[ request.resourceName ] = { ...data[ request.resourceName ], ...request.data };
		}
		return data;
	}, {} );
	return isEmpty( combinedData ) ? undefined : combinedData;
}
