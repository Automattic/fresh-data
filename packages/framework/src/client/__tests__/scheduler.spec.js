import { isEmpty } from 'lodash';
import Scheduler from '../scheduler';
import ResourceRequest, { STATUS } from '../resource-request';
import { MINUTE, SECOND } from '../../utils/constants';

// TODO: Handle timeouts

describe( 'Scheduler', () => {
	const now = new Date();
	const threeMinutesAgo = new Date( now.getTime() - ( 3 * MINUTE ) );
	const fourMinutesAgo = new Date( now.getTime() - ( 4 * MINUTE ) );

	describe( 'constructor', () => {
		it( 'creates an array of requests', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			expect( scheduler.requests ).toEqual( [] );
		} );

		it( 'initializes timeout variables', () => {
			const setTimeout = () => {};
			const clearTimeout = () => {};
			const scheduler = new Scheduler( () => {}, setTimeout, clearTimeout );

			expect( scheduler.setTimeout ).toBe( setTimeout );
			expect( scheduler.clearTimeout ).toBe( clearTimeout );
			expect( scheduler.timeoutId ).toBe( null );
		} );

		it( 'defaults to window.setTimeout and window.clearTimeout', () => {
			const scheduler = new Scheduler( () => {} );

			expect( scheduler.setTimeout ).toBe( window.setTimeout );
			expect( scheduler.clearTimeout ).toBe( window.clearTimeout );
		} );
	} );

	describe( 'getNextRequestDelay', () => {
		it( 'returns null when no requests are scheduled/overdue', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			expect( scheduler.getNextRequestDelay() ).toBeNull();

			scheduler.scheduleRequest( 'completeResource', {}, {}, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.complete;

			expect( scheduler.getNextRequestDelay( now ) ).toBeNull();
		} );

		it( 'returns zero when a request is overdue', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'resource1', {}, {}, threeMinutesAgo );

			expect( scheduler.getNextRequestDelay( now ) ).toBe( 0 );
		} );

		it( 'returns a positive number when a request is scheduled', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now );

			expect( scheduler.getNextRequestDelay( now ) / MINUTE ).toBeCloseTo( 2, 2 );
		} );

		it( 'returns zero when a new request is scheduled that is immediately due', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now );
			scheduler.scheduleRequest( 'resource1', {}, {}, now );

			expect( scheduler.getNextRequestDelay( now ) ).toBe( 0 );
		} );

		it( 'returns the same number when a new request that is scheduled later is added', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now );
			const delayBefore = scheduler.getNextRequestDelay( now );

			scheduler.scheduleRequest( 'resource1', { freshness: 30 * MINUTE }, { lastReceived: fourMinutesAgo }, now );
			const delayAfter = scheduler.getNextRequestDelay( now );

			expect( delayAfter ).toBe( delayBefore );
		} );
	} );

	describe( 'updateDelay', () => {
		it( 'Does not stop or set timeout when no requests are scheduled/overdue', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, () => {} );
			scheduler.stop = jest.fn();

			scheduler.updateDelay();

			expect( setTimeout ).not.toHaveBeenCalled();
			expect( scheduler.stop ).not.toHaveBeenCalled();
		} );

		it( 'Sets timeout when a request is scheduled', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );
			expect( setTimeout.mock.calls[ 0 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 0 ][ 1 ] / MINUTE ).toBeCloseTo( 2, 2 );
		} );

		it( 'Sets zero timeout when a request is overdue', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 2 * MINUTE }, { lastReceived: threeMinutesAgo }, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );
			expect( setTimeout.mock.calls[ 0 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 0 ][ 1 ] ).toBe( 0 );
		} );

		it( 'Starts a new timeout when a newer request is scheduled', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 4 * MINUTE }, { lastReceived: threeMinutesAgo }, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 2 );

			expect( setTimeout.mock.calls[ 1 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 1 ][ 1 ] / MINUTE ).toBeCloseTo( 1, 2 );
		} );

		it( 'Starts a new zero timeout when a immediately due request is scheduled', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );

			scheduler.requests.push(
				new ResourceRequest( 'resource2', {}, {}, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 2 );

			expect( setTimeout.mock.calls[ 1 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 1 ][ 1 ] ).toBe( 0 );
		} );

		it( 'Does not start a new one if there are no longer any requests scheduled/overdue', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: fourMinutesAgo }, threeMinutesAgo )
			);
			scheduler.updateDelay( threeMinutesAgo );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );

			scheduler.requests[ 0 ].getStatus = () => STATUS.complete;
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );
		} );
	} );

	describe( 'stop', () => {
		it( 'Does nothing when no timer is set', () => {
			const setTimeout = () => 123;
			const clearTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, clearTimeout );

			scheduler.stop();

			expect( clearTimeout ).not.toHaveBeenCalled();
		} );

		it( 'Stops the timer when it is set', () => {
			const setTimeout = () => 123;
			const clearTimeout = jest.fn();
			const scheduler = new Scheduler( () => {}, setTimeout, clearTimeout );

			scheduler.requests.push(
				new ResourceRequest( 'resource1', { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, now )
			);
			scheduler.updateDelay( now );

			scheduler.stop();

			expect( clearTimeout ).toHaveBeenCalledTimes( 1 );
			expect( clearTimeout ).toHaveBeenCalledWith( 123 );
		} );
	} );

	describe( 'scheduleRequest', () => {
		it( 'creates an overdue request when no existing state exists', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';

			scheduler.scheduleRequest( resourceName, {}, {}, threeMinutesAgo );
			const request = scheduler.requests[ 0 ];

			expect( request ).not.toBe( undefined );
			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
		} );

		it( 'creates a scheduled request when state exists', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement, resourceState );
			const request = scheduler.requests[ 0 ];

			expect( request ).not.toBe( undefined );
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 2 * MINUTE );
		} );

		it( 'updates an existing scheduled request with a new scheduled requirement', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const requirement2 = { freshness: 4 * MINUTE };
			const requirement3 = { freshness: 2 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( 2 * MINUTE );

			scheduler.scheduleRequest( resourceName, requirement2, resourceState, now );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( 1 * MINUTE );

			scheduler.scheduleRequest( resourceName, requirement3, resourceState, now );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.overdue );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( -( 1 * MINUTE ) );
		} );

		it( 'does not add a new request when an identical previous request is already in flight', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const requirement2 = { freshness: 4 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.requests.length ).toBe( 1 );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( 2 * MINUTE );

			scheduler.requests[ 0 ].getStatus = () => STATUS.inFlight;
			scheduler.scheduleRequest( resourceName, requirement2, resourceState, now );

			expect( scheduler.requests.length ).toBe( 1 );
		} );
	} );

	describe( 'getScheduledRequest', () => {
		it( 'finds a scheduled request', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			const request = scheduler.getScheduledRequest( resourceName );
			expect( request.resourceName ).toBe( resourceName );
			expect( request.getStatus() ).toBe( STATUS.scheduled );
		} );

		it( 'finds an overdue request', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 2 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			const request = scheduler.getScheduledRequest( resourceName );
			expect( request.resourceName ).toBe( resourceName );
			expect( request.getStatus() ).toBe( STATUS.overdue );
		} );
	} );

	describe( 'getInFlightRequests', () => {
		it( 'finds any requests for a resource that are currently in-flight', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.inFlight;

			const requests = scheduler.getInFlightRequests( resourceName );

			expect( requests.length ).toBe( 1 );
			expect( requests[ 0 ].resourceName ).toBe( resourceName );
			expect( requests[ 0 ].getStatus() ).toBe( STATUS.inFlight );
		} );
	} );

	describe( 'isRequestReady', () => {
		it( 'returns false if the resource is still fresh enough', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.isRequestReady( scheduler.requests[ 0 ] ) ).toBeFalsy();
		} );

		it( 'returns true if the resource is not fresh enough', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 2 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.isRequestReady( scheduler.requests[ 0 ] ) ).toBeTruthy();
		} );

		it( 'returns true if the resource has not yet been fetched', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = {};
			const resourceState = {};

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.isRequestReady( scheduler.requests[ 0 ] ) ).toBeTruthy();
		} );

		it( 'returns false if the resource status is anything but scheduled or overdue', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			const resourceName = 'resource1';
			const requirement1 = {};
			const resourceState = {};

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			const request = scheduler.requests[ 0 ];

			request.getStatus = () => STATUS.complete;
			expect( scheduler.isRequestReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.failed;
			expect( scheduler.isRequestReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.inFlight;
			expect( scheduler.isRequestReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.timedOut;
			expect( scheduler.isRequestReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.unnecessary;
			expect( scheduler.isRequestReady( request ) ).toBeFalsy();
		} );
	} );

	describe( 'sendReadyRequests', () => {
		it( 'does nothing when there are no requests in queue', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			expect( isEmpty( scheduler.requests ) ).toBeTruthy();
			scheduler.sendReadyRequests();
			expect( isEmpty( scheduler.requests ) ).toBeTruthy();
		} );

		it( 'does nothing when there are no scheduled or overdue requests in queue', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'inFlightResource', {}, {}, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.inFlight;

			scheduler.scheduleRequest( 'timedOutResource', {}, {}, now );
			scheduler.requests[ 1 ].getStatus = () => STATUS.timedOut;

			scheduler.scheduleRequest( 'completeResource', {}, {}, now );
			scheduler.requests[ 2 ].getStatus = () => STATUS.complete;

			scheduler.scheduleRequest( 'failedResource', {}, {}, now );
			scheduler.requests[ 3 ].getStatus = () => STATUS.failed;

			scheduler.scheduleRequest( 'unnecessary', {}, {}, now );
			scheduler.requests[ 4 ].getStatus = () => STATUS.unnecessary;

			scheduler.sendReadyRequests( now );
			expect( scheduler.requests.length ).toBe( 5 );
		} );

		it( 'Calls fetch with resource names', () => {
			const fetch = jest.fn();
			const scheduler = new Scheduler( fetch, () => {}, () => {} );

			scheduler.scheduleRequest(
				'resource1',
				{ freshness: 5 * MINUTE },
				{},
				threeMinutesAgo
			);
			scheduler.scheduleRequest(
				'resource2',
				{ freshness: 3 * MINUTE },
				{ lastReceived: fourMinutesAgo },
				threeMinutesAgo
			);

			expect( scheduler.requests[ 0 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 1 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );

			fetch.mockReturnValue( Promise.resolve() );

			return scheduler.sendReadyRequests( now ).then( () => {
				expect( fetch ).toHaveBeenCalledWith( [
					scheduler.requests[ 0 ].resourceName,
					scheduler.requests[ 1 ].resourceName
				] );
			} );
		} );

		it( 'calls request.requested for each ready request', () => {
			const fetch = jest.fn();
			const scheduler = new Scheduler( fetch, () => {}, () => {} );

			scheduler.scheduleRequest(
				'resource1',
				{ freshness: 5 * MINUTE },
				{},
				threeMinutesAgo
			);
			scheduler.scheduleRequest(
				'resource2',
				{ freshness: 3 * MINUTE },
				{ lastReceived: fourMinutesAgo },
				threeMinutesAgo
			);

			expect( scheduler.requests[ 0 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 1 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );

			const promise = Promise.resolve();
			fetch.mockReturnValue( promise );

			return scheduler.sendReadyRequests( now ).then( () => {
				expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.complete );
				expect( scheduler.requests[ 1 ].getStatus( now ) ).toBe( STATUS.complete );
			} );
		} );
	} );

	describe( 'cleanUp', () => {
		it( 'does not clear scheduled requests', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'scheduledResource', {}, {}, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.scheduled;

			expect( scheduler.requests.length ).toBe( 1 );

			scheduler.cleanUp();

			expect( scheduler.requests.length ).toBe( 1 );
			expect( scheduler.requests[ 0 ].getStatus() ).toBe( STATUS.scheduled );
		} );

		it( 'clears out completed and failed requests', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );

			scheduler.scheduleRequest( 'scheduledResource', {}, {}, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.scheduled;

			scheduler.scheduleRequest( 'completeResource', {}, {}, now );
			scheduler.requests[ 1 ].getStatus = () => STATUS.complete;

			scheduler.scheduleRequest( 'failedResource', {}, {}, now );
			scheduler.requests[ 2 ].getStatus = () => STATUS.failed;

			expect( scheduler.requests.length ).toBe( 3 );

			scheduler.cleanUp( now );

			expect( scheduler.requests.length ).toBe( 1 );
			expect( scheduler.requests[ 0 ].getStatus() ).toBe( STATUS.scheduled );
		} );
	} );

	describe( 'resendTimeouts', () => {
		it( 'does nothing when no requests are timed out', () => {
			const fetch = jest.fn();
			const scheduler = new Scheduler( fetch, () => {}, () => {} );

			scheduler.scheduleRequest(
				'resource1',
				{ freshness: 5 * MINUTE, timeout: 5 * SECOND },
				{},
				threeMinutesAgo
			);

			return scheduler.resendTimeouts().then( () => {
				expect( fetch ).not.toHaveBeenCalled();
			} );
		} );

		it( 're-sends timed out requests', () => {
			const fetch = jest.fn();
			const scheduler = new Scheduler( fetch, () => {}, () => {} );

			scheduler.scheduleRequest(
				'resource1',
				{ freshness: 5 * MINUTE, timeout: 5 * SECOND },
				{},
				threeMinutesAgo
			);
			scheduler.requests[ 0 ].getStatus = () => STATUS.timedOut;

			fetch.mockReturnValue( Promise.resolve() );

			return scheduler.resendTimeouts( now ).then( () => {
				expect( fetch ).toHaveBeenCalledWith( [ scheduler.requests[ 0 ].resourceName ] );
			} );
		} );
	} );

	describe( 'processRequests', () => {
		it( 'should clean up, send ready requests, resend timeouts, and update the delay', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			scheduler.cleanUp = jest.fn();
			scheduler.sendReadyRequests = jest.fn();
			scheduler.resendTimeouts = jest.fn();
			scheduler.updateDelay = jest.fn();

			scheduler.processRequests();

			expect( scheduler.cleanUp ).toHaveBeenCalledTimes( 1 );
			expect( scheduler.sendReadyRequests ).toHaveBeenCalledTimes( 1 );
			expect( scheduler.resendTimeouts ).toHaveBeenCalledTimes( 1 );
			expect( scheduler.updateDelay ).toHaveBeenCalledTimes( 1 );
		} );
	} );
} );
