import { isEmpty } from 'lodash';
import Scheduler from '../scheduler';
import { STATUS } from '../resource-request';
import { MINUTE, SECOND } from '../../utils/constants';

// TODO: Handle timeouts

describe( 'Scheduler', () => {
	const now = new Date();
	const threeMinutesAgo = new Date( now.getTime() - ( 3 * MINUTE ) );
	const fourMinutesAgo = new Date( now.getTime() - ( 4 * MINUTE ) );

	describe( 'constructor', () => {
		it( 'creates an array of requests', () => {
			const scheduler = new Scheduler( () => {}, 0 );

			expect( scheduler.requests ).toEqual( [] );
		} );
	} );

	describe( 'scheduleRequest', () => {
		it( 'creates an overdue request when no existing state exists', () => {
			const scheduler = new Scheduler( () => {}, 0 );
			const resourceName = 'resource1';

			scheduler.scheduleRequest( resourceName, {}, {}, threeMinutesAgo );
			const request = scheduler.requests[ 0 ];

			expect( request ).not.toBe( undefined );
			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
		} );

		it( 'creates a scheduled request when state exists', () => {
			const scheduler = new Scheduler( () => {}, 0 );
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
			const scheduler = new Scheduler( () => {}, 0 );
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
			const scheduler = new Scheduler( () => {}, 0 );
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
			const scheduler = new Scheduler( () => {}, 0 );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			const request = scheduler.getScheduledRequest( resourceName );
			expect( request.resourceName ).toBe( resourceName );
			expect( request.getStatus() ).toBe( STATUS.scheduled );
		} );
	} );

	describe( 'getInFlightRequests', () => {
		it( 'finds any requests for a resource that are currently in-flight', () => {
			const scheduler = new Scheduler( () => {}, 0 );
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
			const scheduler = new Scheduler( () => {}, 0 );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.isRequestReady( scheduler.requests[ 0 ] ) ).toBeFalsy();
		} );

		it( 'returns true if the resource is not fresh enough', () => {
			const scheduler = new Scheduler( () => {}, 0 );
			const resourceName = 'resource1';
			const requirement1 = { freshness: 2 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.isRequestReady( scheduler.requests[ 0 ] ) ).toBeTruthy();
		} );

		it( 'returns true if the resource has not yet been fetched', () => {
			const scheduler = new Scheduler( () => {}, 0 );
			const resourceName = 'resource1';
			const requirement1 = {};
			const resourceState = {};

			scheduler.scheduleRequest( resourceName, requirement1, resourceState, now );
			expect( scheduler.isRequestReady( scheduler.requests[ 0 ] ) ).toBeTruthy();
		} );

		it( 'returns false if the resource status is anything but scheduled or overdue', () => {
			const scheduler = new Scheduler( () => {}, 0 );
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
			const scheduler = new Scheduler( () => {}, 0 );

			expect( isEmpty( scheduler.requests ) ).toBeTruthy();
			scheduler.sendReadyRequests();
			expect( isEmpty( scheduler.requests ) ).toBeTruthy();
		} );

		it( 'does nothing when there are no scheduled or overdue requests in queue', () => {
			const scheduler = new Scheduler( () => {}, 0 );

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
			const scheduler = new Scheduler( fetch, 0 );

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
			const scheduler = new Scheduler( fetch, 0 );

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
		it( 'clears out completed and failed requests', () => {
			const scheduler = new Scheduler( () => {}, 0 );

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
		it( 're-sends timed out requests', () => {
			const fetch = jest.fn();
			const scheduler = new Scheduler( fetch, 0 );

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

	describe( 'setInterval', () => {
		it( 'should be called by the constructor', () => {
			const setInterval = jest.fn();
			new Scheduler( () => {}, 1000, setInterval );

			expect( setInterval ).toHaveBeenCalled();
		} );

		it( 'should provide a callback', () => {
			let setIntervalCallback = null;
			let setIntervalInterval = null;
			const setInterval = ( callback, interval ) => {
				setIntervalCallback = callback;
				setIntervalInterval = interval;
			};

			const scheduler = new Scheduler( () => {}, 1000, setInterval );
			scheduler.sendReadyRequests = jest.fn();
			scheduler.resendTimeouts = jest.fn();
			scheduler.cleanUp = jest.fn();
			setIntervalCallback();

			expect( setIntervalInterval ).toBe( 1000 );
			expect( scheduler.sendReadyRequests ).toHaveBeenCalledTimes( 1 );
			expect( scheduler.resendTimeouts ).toHaveBeenCalledTimes( 1 );
			expect( scheduler.cleanUp ).toHaveBeenCalledTimes( 1 );
		} );
	} );
} );
