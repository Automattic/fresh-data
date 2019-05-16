import { find } from 'lodash';
import ResourceRequest, { STATUS } from './resource-request';

const DEFAULT_FETCH_INTERVAL = 5000; // Five seconds

export default class Scheduler {
	constructor(
		fetch,
		fetchInterval = DEFAULT_FETCH_INTERVAL,
		setInterval = window.setInterval,
	) {
		this.fetch = fetch;
		this.requests = [];
		this.timerId = null;

		if ( fetchInterval > 0 ) {
			setInterval( () => {
				this.cleanUp();
				this.resendTimeouts();
				this.sendReadyRequests();
			}, fetchInterval );
		}
	}

	/**
	 * Finds a request that is either scheduled or overdue.
	 * @param {string} resourceName The name of the resource to be read
	 * @return {ResourceRequest} The scheduled request, or null if none found
	 */
	getScheduledRequest = ( resourceName ) => {
		return find( this.requests, ( r ) => {
			if ( resourceName === r.resourceName ) {
				const status = r.getStatus();
				return STATUS.scheduled === status || STATUS.overdue === status;
			}
			return false;
		} );
	}

	/**
	 * Finds requests that are in flight by resourceName
	 * @param {string} resourceName The name of the resource to check
	 * @return {Array} Any requests for the given resource which are currently in flight.
	 */
	getInFlightRequests = ( resourceName ) => {
		return this.requests.filter( ( r ) => {
			return ( resourceName === r.resourceName && STATUS.inFlight === r.getStatus() );
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
		if ( this.getInFlightRequests( resourceName ).length > 0 ) {
			// Do nothing, there's already a request in flight.
			return;
		}

		const existingRequest = this.getScheduledRequest( resourceName );
		if ( existingRequest ) {
			existingRequest.addRequirement( requirement, resourceState, now );
		} else {
			this.requests.push( new ResourceRequest( resourceName, requirement, resourceState, now ) );
		}
	};

	/**
	 * Send a list of requests.
	 * @param {Array} requests The list of requests to send.
	 * @param {Date} now The current time.
	 * @return {Promise} A promise returned from the fetch call.
	 */
	sendRequests = ( requests, now = new Date() ) => {
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
		return this.sendRequests( readyRequests );
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
		const status = request.getStatus();
		if ( STATUS.scheduled == status || STATUS.overdue == status ) {
			const timeLeft = request.getTimeLeft( now );
			return ( timeLeft <= 0 );
		}
		return false;
	};
}
