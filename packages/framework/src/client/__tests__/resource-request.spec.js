import ResourceRequest, { STATUS } from '../resource-request';
import { MINUTE, SECOND } from '../../utils/constants';

describe( 'ResourceRequest', () => {
	const now = new Date();
	const sixMinutesAgo = new Date( now.getTime() - ( 6 * MINUTE ) );
	const threeMinutesAgo = new Date( now.getTime() - ( 3 * MINUTE ) );
	const tenSecondsAgo = new Date( now.getTime() - ( 10 * SECOND ) );
	const twoMinutesFromNow = new Date( now.getTime() + ( 2 * MINUTE ) );

	describe( 'constructor', () => {
		it( 'creates a request to be fetched immediately', () => {
			const requirement = {};
			const resourceState = {};

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus() ).toBe( STATUS.overdue );
			expect( request.time ).toBe( now );
		} );

		it( 'creates a scheduled request for when freshness expires', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.time ).toEqual( twoMinutesFromNow );
		} );

		it( 'creates an unnecessary request when already fetched and no freshness specified', () => {
			const requirement = { timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus( now ) ).toBe( STATUS.unnecessary );
			expect( request.time ).toBe( null );
		} );
	} );

	describe( 'getStatus', () => {
		it( 'shows scheduled', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
		} );

		it( 'shows overdue', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
		} );

		it( 'shows inFlight', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );
			request.requested( Promise.resolve(), now );

			expect( request.getStatus( now ) ).toBe( STATUS.inFlight );

			return request.promise;
		} );

		it( 'shows complete', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );
			request.requested( Promise.resolve(), now );

			return request.promise.then( () => {
				expect( request.getStatus( now ) ).toBe( STATUS.complete );
			} );
		} );

		it( 'shows failed', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );
			request.requested( Promise.reject( 'error message' ), now );

			return request.promise.catch( () => {
				expect( request.getStatus( now ) ).toBe( STATUS.failed );
				expect( request.error ).toBe( 'error message' );
			} );
		} );

		it( 'shows timed out', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, tenSecondsAgo );
			request.requested( Promise.resolve(), tenSecondsAgo );

			expect( request.getStatus( now ) ).toBe( STATUS.timedOut );

			return request.promise;
		} );
	} );

	describe( 'getTimeLeft', () => {
		it( 'returns a positive value for a scheduled request', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft() ).toBeLessThan( 2 * MINUTE );
		} );

		it( 'returns a negative value for an overdue request', () => {
			const requirement = { freshness: 2 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement, resourceState, now );

			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
			expect( request.getTimeLeft( now ) ).toBe( -( 1 * MINUTE ) );
		} );
	} );

	describe( 'requested', () => {
		it( 'progresses through success flow correctly', () => {
			const request = new ResourceRequest( 'resource1', {}, {}, tenSecondsAgo );

			expect( request.getStatus( now ) ).toBe( STATUS.overdue );

			let promiseResolve;
			const promise = new Promise( ( resolve ) => {
				promiseResolve = resolve;
			} );

			request.requested( promise );
			expect( request.getStatus() ).toBe( STATUS.inFlight );

			promiseResolve();

			return promise.then( () => {
				expect( request.getStatus() ).toBe( STATUS.complete );
			} );
		} );

		it( 'progresses through error flow correctly', () => {
			const request = new ResourceRequest( 'resource1', {}, {}, tenSecondsAgo );

			expect( request.getStatus( now ) ).toBe( STATUS.overdue );

			let promiseReject;
			const promise = new Promise( ( resolve, reject ) => {
				promiseReject = reject;
			} );

			request.requested( promise, now );
			expect( request.getStatus( now ) ).toBe( STATUS.inFlight );

			promiseReject( 'error message' );

			return promise.catch( () => {
				expect( request.getStatus( now ) ).toBe( STATUS.failed );
				expect( request.error ).toBe( 'error message' );
			} );
		} );
	} );

	describe( 'addRequirement', () => {
		it( 'reschedules earlier', () => {
			const requirement1 = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const requirement2 = { freshness: 4 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement1, resourceState, tenSecondsAgo );
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 2 * MINUTE );

			expect( request.addRequirement( requirement2, resourceState, now ) ).toBeTruthy();
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 1 * MINUTE );
		} );

		it( 'does not reschedule if request is already adequate', () => {
			const requirement1 = { freshness: 4 * MINUTE, timeout: 3 * SECOND };
			const requirement2 = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement1, resourceState, tenSecondsAgo );
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 1 * MINUTE );

			expect( request.addRequirement( requirement2, resourceState, now ) ).toBeTruthy();
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 1 * MINUTE );
		} );

		it( 'fails if the request is not scheduled', () => {
			const requirement1 = { timeout: 3 * SECOND };
			const requirement2 = { freshness: 4 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( 'resource1', requirement1, resourceState, tenSecondsAgo );
			expect( request.getStatus( now ) ).toBe( STATUS.unnecessary );

			expect( request.addRequirement( requirement2, resourceState, now ) ).toBeFalsy();
			expect( request.getStatus( now ) ).toBe( STATUS.unnecessary );
		} );
	} );
} );
