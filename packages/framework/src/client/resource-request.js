import debugFactory from 'debug';
import { isMatch, isNil } from 'lodash';
import { isDateEarlier } from '../utils/dates';
import { SECOND } from '../utils/constants';

const DEFAULT_TIMEOUT = 30 * SECOND;

export const STATUS = {
	failed: 'Failed',
	inFlight: 'In Flight',
	complete: 'Complete',
	overdue: 'Overdue',
	scheduled: 'Scheduled',
	timedOut: 'Timed Out',
	unnecessary: 'Unnecessary',
};

export default class ResourceRequest {
	/**
	 * Creates a new Resource Request object.
	 * @param {Object} requirement The requirement for this request (e.g. freshness/timeout)
	 * @param {Object} resourceState The current state of this request
	 * @param {string} resourceName The name of the resource
	 * @param {string} operation The name of the operation to be performed
	 * @param {Object} data Data to be sent for the operation
	 * @param {Date} now The current time
	 */
	constructor( requirement, resourceState, resourceName, operation, data, now = new Date() ) {
		this.debug = debugFactory( 'fresh-data:request(' + resourceName + ' ' + operation + ')' );
		this.resourceName = resourceName;
		this.operation = operation;
		this.data = data;
		this.time = calculateRequestTime( requirement, resourceState, now );
		this.timeout = requirement.timeout || DEFAULT_TIMEOUT;
		this.promise = null;
		this.timeRequested = null;
		this.timeCompleted = null;
		this.error = null;

		if ( this.time ) {
			const seconds = ( this.time.getTime() - now.getTime() ) / 1000.0;
			this.debug( `New request for "${ this.resourceName }" to be fetched in ${ seconds }s` );
		}
	}

	/**
	 * Append to the current request
	 * @param {Object} requirement Any additional requirements to combine with the current request
	 * @param {Object} resourceState The current state for this resource
	 * @param {Object} data Data to be appended over the current data for this request
	 * @param {Date} now The current time
	 * @Return {boolean} True if successful, false if not
	 */
	append = ( requirement, resourceState, data, now = new Date() ) => {
		return this.appendRequirement( requirement, resourceState, now ) &&
			this.appendData( data );
	}

	appendRequirement = ( requirement, resourceState, now = new Date() ) => {
		const status = this.getStatus( now );
		if ( STATUS.scheduled === status || STATUS.overdue === status ) {
			const requestTime = calculateRequestTime( requirement, resourceState, now );
			if ( isDateEarlier( this.time, requestTime ) ) {
				this.time = requestTime;
				const seconds = ( this.time.getTime() - now.getTime() ) / 1000.0;
				this.debug( `Rescheduling request for "${ this.resourceName }" to fetched in ${ seconds }s` );
			}
			this.timeout = Math.min( this.timeout, requirement.timeout || DEFAULT_TIMEOUT );
			return true;
		}
		this.debug( `Cannot add requirement to request with "${ this.getStatus( now ) }" status` );
		return false;
	}

	alreadyHasData = ( newData ) => {
		if ( ! newData || this.data === newData ) {
			return true;
		} else if ( isNil( this.data ) ) {
			return false;
		}

		return isMatch( this.data, newData );
	}

	appendData = ( newData ) => {
		if ( ! this.alreadyHasData( newData ) ) {
			this.data = { ...this.data, ...newData };
		}
		return true;
	}

	getStatus = ( now = new Date() ) => {
		if ( ! this.time ) {
			return STATUS.unnecessary;
		}
		if ( this.timeRequested ) {
			if ( this.timeCompleted ) {
				if ( this.error ) {
					return STATUS.failed;
				}
				return STATUS.complete;
			}
			if ( now.getTime() - this.timeRequested > this.timeout ) {
				return STATUS.timedOut;
			}
			return STATUS.inFlight;
		}
		if ( isDateEarlier( now, this.time ) ) {
			return STATUS.overdue;
		}
		return STATUS.scheduled;
	}

	getTimeLeft = ( now = new Date() ) => {
		return this.time.getTime() - now.getTime();
	}

	/**
	 * Checks if a request is ready.
	 * @param {Date} now The current time.
	 * @return {boolean} True if the request is ready to be sent, false otherwise.
	 */
	isReady = ( now = new Date() ) => {
		const status = this.getStatus();
		if ( STATUS.scheduled === status || STATUS.overdue === status ) {
			const timeLeft = this.getTimeLeft( now );
			return ( timeLeft <= 0 );
		}
		return false;
	};

	requested = ( promise, now = new Date() ) => {
		this.debug( `Request for ${ this.resourceName } submitted...` );
		this.timeRequested = now;
		this.promise = promise;
	}

	requestComplete = () => {
		this.promise = null;
		this.timeCompleted = new Date();
		const seconds = ( this.timeCompleted.getTime() - this.timeRequested.getTime() ) / 1000.0;
		this.debug( `Request for ${ this.resourceName } completed in ${ seconds }s` );
	}

	requestFailed = ( error ) => {
		this.promise = null;
		this.timeCompleted = new Date();
		this.error = error;
		this.debug( `Request for ${ this.resourceName } failed: `, error );
	}
}

function calculateRequestTime( requirement, resourceState, now ) {
	const { freshness } = requirement;
	const { lastReceived } = resourceState;

	if ( ! lastReceived ) {
		// Never fetched, so fetch now.
		return now;
	}
	if ( freshness ) {
		// Fetch after freshness expires.
		return new Date( lastReceived.getTime() + freshness );
	}
	return null;
}
