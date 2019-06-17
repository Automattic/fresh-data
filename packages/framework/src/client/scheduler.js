import debugFactory from 'debug';
import ResourceRequest, { STATUS } from './resource-request';
import { find, isEmpty, isEqual, isNil, uniq } from 'lodash';

const debug = debugFactory( 'fresh-data:scheduler' );

const DEFAULT_READ_OPERATION = 'read';

export default class Scheduler {
	/**
	 * Creates a new Scheduler
	 * @param {Object} operations The mapping of operation names to functions
	 * @param {number} timerInterval Milliseconds between timer iterations (defaults to 500)
	 * @param {function} setInterval The function to set an interval timer (defaults to window.setInterval)
	 * @param {function} clearInterval The function to clear an internal timer by id (defaults to window.setInterval)
	 */
	constructor(
		operations,
		setTimeout = window.setTimeout,
		clearTimeout = window.clearTimeout,
	) {
		this.operations = operations;
		this.requests = [];
		this.setTimeout = setTimeout;
		this.clearTimeout = clearTimeout;
		this.timeoutId = null;
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
	 * Finds a request that is either scheduled or overdue.
	 * @param {string} resourceName The name of the resource for the operation
	 * @param {string} operation The name of the operation to be performed (defaults to 'read')
	 * @param {Date} now The current time.
	 * @return {ResourceRequest} The scheduled request, or null if none found
	 */
	getScheduledRequest = ( resourceName, operation = DEFAULT_READ_OPERATION, now = new Date() ) => {
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
	 * @param {string} operation The name of the operation to be performed (defaults to 'read')
	 * @param {Date} now The current time.
	 * @return {Array} Any requests for the given resource which are currently in flight.
	 */
	getInFlightRequests = ( resourceName, operation = DEFAULT_READ_OPERATION, now = new Date() ) => {
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
	 * @param {string} operation The name of the operation to be performed (defaults to 'read')
	 * @param {Object} data The data to be sent for the operation (defaults to null)
	 * @param {Date} now The current time.
	 */
	scheduleRequest = (
		requirement,
		resourceState,
		resourceName,
		operation = DEFAULT_READ_OPERATION,
		data = null,
		now = new Date()
	) => {
		if ( this.getInFlightRequests( resourceName, operation, now ).reduce( ( request ) => {
			return request || isEqual( request.data, data ) || ( isNil( request.data ) && isNil( data ) );
		}, false ) ) {
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

	/**
	 * Send a specific list of requests.
	 * @param {Array} requests The requests to send.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the operation call.
	 */
	sendRequests = ( requests, now ) => {
		// Split the requests up by operation, so we can send one of each operation.
		const requestsByOperation = getRequestsByOperation( requests, now );
		const promises = [];

		Object.keys( requestsByOperation ).forEach( ( operationName ) => {
			// Send one operation, and associate all requests for it
			const operationFunc = this.operations[ operationName ];
			promises.push( sendOperation( operationFunc, requests ) );
		} );

		// Return a list of operation promises
		return Promise.all( promises );
	};

	/**
	 * Send any scheduled requests that are ready.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the operation call.
	 */
	sendReadyRequests = ( now = new Date() ) => {
		const readyRequests = this.requests.filter( ( request ) => request.isReady() );
		return this.sendRequests( readyRequests, now );
	}

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
 * Sorts an array of requests by operation name
 * @param {Array} requests An array of requests to be sorted
 * @param {Date} now The current time
 * @return {Object} The same requests as given, but in an object keyed by operation name
 */
export function getRequestsByOperation( requests ) {
	return requests.reduce( ( requestsByOperation, request ) => {
		const requestsForOperation = requestsByOperation[ request.operation ] || [];
		requestsForOperation.push( request );
		requestsByOperation[ request.operation ] = requestsForOperation;
		return requestsByOperation;
	}, {} );
}

/**
 * Sends an operation for a set of given operation requests
 * @param {Promise} operation The actual operation promise from the apiSpec
 * @param {Array} requests An array of requests for the given operation
 * @param {Date} now The current time
 * @return {Promise} The promise returned from the operation
 */
export function sendOperation( operation, requests, now ) {
	const resourceNames = uniq( requests.map( request => request.resourceName ) );
	const data = combineRequestData( requests );
	const promise = Promise.resolve( operation( resourceNames, data ) );

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
