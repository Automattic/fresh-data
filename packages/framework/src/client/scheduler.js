import debugFactory from 'debug';
import { find } from 'lodash';
import ResourceRequest, { STATUS } from './resource-request';

const debug = debugFactory( 'fresh-data:scheduler' );

export default class Scheduler {
	constructor(
		fetch,
		setTimeout = window.setTimeout,
		clearTimeout = window.clearTimeout,
	) {
		this.fetch = fetch;
		this.requests = [];
		this.setTimeout = setTimeout;
		this.clearTimeout = clearTimeout;
		this.timeoutId = null;
		this.nextRequestTime = null;
	}

	/**
	 * Cancels the processing of requests.
	 */
	stop = () => {
		if ( null !== this.timeoutId ) {
			debug( 'Cancelling next update.' );
			this.clearTimeout( this.timeoutId );
			this.timeoutId = null;
			this.nextRequestTime = null;
		}
	}

	/**
	 * (Re)schedules next run of request processing, based on the current collection of requests.
	 * Note: Only reschedules if necessary.
	 * @param {Date} now The current time
	 */
	updateDelay = ( now = new Date() ) => {
		const currentDelay = this.nextRequestTime ? now.getTime() - this.nextRequestTime : null;
		const nextDelay = this.getNextRequestDelay( now );

		if ( nextDelay !== currentDelay ) {
			this.stop();

			if ( nextDelay !== null ) {
				debug( `Scheduling next update for ${ nextDelay / 1000 } seconds from now.` );
				this.nextRequestTime = new Date( now.getTime() + nextDelay );
				this.timeoutId = this.setTimeout( this.processRequests, nextDelay );
			}
		}
	}

	/**
	 * Processes the current collection of requests.
	 * No need to call this directly, it is called by the internal timer.
	 */
	processRequests = () => {
		this.cleanUp();
		this.resendTimeouts();
		this.sendReadyRequests();
		this.updateDelay();
	}

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
	}

	/**
	 * Finds a request that is either scheduled or overdue.
	 * @param {string} resourceName The name of the resource to be read
	 * @param {Date} now The current time
	 * @return {ResourceRequest} The scheduled request, or null if none found
	 */
	getScheduledRequest = ( resourceName, now = new Date() ) => {
		return find( this.requests, ( r ) => {
			if ( resourceName === r.resourceName ) {
				const status = r.getStatus( now );
				return STATUS.scheduled === status || STATUS.overdue === status;
			}
			return false;
		} );
	}

	/**
	 * Finds requests that are in flight by resourceName
	 * @param {string} resourceName The name of the resource to check
	 * @param {Date} now The current time
	 * @return {Array} Any requests for the given resource which are currently in flight.
	 */
	getInFlightRequests = ( resourceName, now = new Date() ) => {
		return this.requests.filter( ( r ) => {
			return ( resourceName === r.resourceName && STATUS.inFlight === r.getStatus( now ) );
		} );
	}

	/**
	 * Schedule a read of a resource name according to the requirement set given.
	 * @param {string} resourceName The name of the resource to be read
	 * @param {Object} requirement The set of requirements (freshness, timeout)
	 * @param {Object} resourceState The current snapshot of resource state
	 * @param {Date} now The current time.
	 */
	scheduleRequest = ( resourceName, requirement, resourceState, now = new Date() ) => {
		if ( this.getInFlightRequests( resourceName, now ).length > 0 ) {
			// Do nothing, there's already a request in flight.
			return;
		}

		const existingRequest = this.getScheduledRequest( resourceName, now );
		if ( existingRequest ) {
			existingRequest.addRequirement( requirement, resourceState, now );
		} else {
			this.requests.push( new ResourceRequest( resourceName, requirement, resourceState, now ) );
		}
		this.updateDelay( now );
	};

	/**
	 * Send a list of requests.
	 * @param {Array} requests The list of requests to send.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the fetch call.
	 */
	sendRequests = ( requests, now ) => {
		if ( requests.length > 0 ) {
			const promise = this.fetch( requests.map( request => request.resourceName ) );

			requests.forEach( ( request ) => {
				request.requested( promise, now );
			} );
			return promise;
		}
		// No requests to send.
		return Promise.resolve();
	};

	/**
	 * Send any scheduled requests that are ready to be sent.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the fetch call.
	 */
	sendReadyRequests = ( now = new Date() ) => {
		const readyRequests = this.requests.filter( ( request ) => {
			return this.isRequestReady( request, now );
		} );
		return this.sendRequests( readyRequests, now );
	};

	/**
	 * Send any scheduled requests that are timed out.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the fetch call.
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

	/**
	 * Checks if a request is ready.
	 * @param {ResourceRequest} request The request to check.
	 * @param {Date} now The current time.
	 * @return {boolean} True if the request is ready to be sent, false otherwise.
	 */
	isRequestReady = ( request, now = new Date() ) => {
		const status = request.getStatus( now = new Date() );
		if ( STATUS.scheduled === status || STATUS.overdue === status ) {
			const timeLeft = request.getTimeLeft( now );
			return ( timeLeft <= 0 );
		}
		return false;
	};
}
