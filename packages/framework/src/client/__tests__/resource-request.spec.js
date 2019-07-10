import ResourceRequest, { STATUS } from '../resource-request';
import { MINUTE, SECOND } from '../../utils/constants';

describe( 'ResourceRequest', () => {
	const now = new Date();
	const sixMinutesAgo = new Date( now.getTime() - ( 6 * MINUTE ) );
	const threeMinutesAgo = new Date( now.getTime() - ( 3 * MINUTE ) );
	const tenSecondsAgo = new Date( now.getTime() - ( 10 * SECOND ) );
	const twoMinutesFromNow = new Date( now.getTime() + ( 2 * MINUTE ) );

	describe( 'constructor', () => {
		it( 'creates a request to be requested immediately', () => {
			const requirement = {};
			const resourceState = {};
			const data = {};

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'operation1', data, now );

			expect( request.resourceName ).toBe( 'resource1' );
			expect( request.operation ).toBe( 'operation1' );
			expect( request.data ).toBe( data );
			expect( request.getStatus() ).toBe( STATUS.overdue );
			expect( request.time ).toBe( now );
		} );

		it( 'creates a scheduled request for when freshness expires', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );

			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.time ).toEqual( twoMinutesFromNow );
		} );

		it( 'creates an unnecessary request when already fetched and no freshness specified', () => {
			const requirement = { timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );

			expect( request.getStatus( now ) ).toBe( STATUS.unnecessary );
			expect( request.time ).toBe( null );
		} );
	} );

	describe( 'getStatus', () => {
		it( 'shows scheduled', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );

			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
		} );

		it( 'shows overdue', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );

			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
		} );

		it( 'shows inFlight', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );
			request.requested( Promise.resolve(), now );

			expect( request.getStatus( now ) ).toBe( STATUS.inFlight );

			return request.promise;
		} );

		it( 'shows complete', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );
			request.requested( Promise.resolve(), now );
			request.requestComplete();

			expect( request.getStatus( now ) ).toBe( STATUS.complete );
		} );

		it( 'shows failed', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );
			request.requested( Promise.resolve(), now );
			request.requestFailed( 'error message' );

			expect( request.getStatus( now ) ).toBe( STATUS.failed );
			expect( request.error ).toBe( 'error message' );
		} );

		it( 'shows timed out', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: sixMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, tenSecondsAgo );
			request.requested( Promise.resolve(), tenSecondsAgo );

			expect( request.getStatus( now ) ).toBe( STATUS.timedOut );

			return request.promise;
		} );
	} );

	describe( 'getTimeLeft', () => {
		it( 'returns a positive value for a scheduled request', () => {
			const requirement = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );

			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft() ).toBeLessThan( 2 * MINUTE );
		} );

		it( 'returns a negative value for an overdue request', () => {
			const requirement = { freshness: 2 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement, resourceState, 'resource1', 'read', undefined, now );

			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
			expect( request.getTimeLeft( now ) ).toBe( -( 1 * MINUTE ) );
		} );
	} );

	describe( 'isReady', () => {
		it( 'returns true if the scheduled request has zero time left', () => {
			const request = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, now );
			request.getTimeLeft = () => 0;

			expect( request.isReady() ).toBeTruthy();
		} );

		it( 'returns true if the scheduled request has negative time left', () => {
			const request = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, now );
			request.getTimeLeft = () => -500;

			expect( request.isReady() ).toBeTruthy();
		} );

		it( 'returns false if the scheduled request has time left', () => {
			const request = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, now );
			request.getTimeLeft = () => 500;

			expect( request.isReady() ).toBeFalsy();
		} );

		it( 'returns false if the resource status is anything but scheduled or overdue', () => {
			const request = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, now );

			request.getStatus = () => STATUS.complete;
			expect( request.isReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.failed;
			expect( request.isReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.inFlight;
			expect( request.isReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.timedOut;
			expect( request.isReady( request ) ).toBeFalsy();

			request.getStatus = () => STATUS.unnecessary;
			expect( request.isReady( request ) ).toBeFalsy();
		} );
	} );

	describe( 'alreadyHasData', () => {
		it( 'returns false if no data is set', () => {
			const request1 = new ResourceRequest( {}, {}, 'resource1', 'read' );
			const request2 = new ResourceRequest( {}, {}, 'resource1', 'read', undefined );

			expect( request1.alreadyHasData( { one: 1 } ) ).toBeFalsy();
			expect( request2.alreadyHasData( { one: 1 } ) ).toBeFalsy();
		} );

		it( 'returns true if data is set', () => {
			const request1 = new ResourceRequest( {}, {}, 'resource1', 'read', { one: 1 } );

			expect( request1.alreadyHasData( { one: 1 } ) ).toBeTruthy();
		} );

		it( 'returns flase if data set is different', () => {
			const request1 = new ResourceRequest( {}, {}, 'resource1', 'read', { one: 1 } );

			expect( request1.alreadyHasData( { one: 2 } ) ).toBeFalsy();
		} );
	} );

	describe( 'append', () => {
		it( 'reschedules earlier', () => {
			const requirement1 = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const requirement2 = { freshness: 4 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement1, resourceState, 'resource1', 'read', undefined, tenSecondsAgo );
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 2 * MINUTE );

			expect( request.append( requirement2, resourceState, undefined, now ) ).toBeTruthy();
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 1 * MINUTE );
		} );

		it( 'does not reschedule if request is already adequate', () => {
			const requirement1 = { freshness: 4 * MINUTE, timeout: 3 * SECOND };
			const requirement2 = { freshness: 5 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement1, resourceState, 'resource1', 'read', undefined, tenSecondsAgo );
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 1 * MINUTE );

			expect( request.append( requirement2, resourceState, undefined, now ) ).toBeTruthy();
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 1 * MINUTE );
		} );

		it( 'fails if the request is not scheduled', () => {
			const requirement1 = { timeout: 3 * SECOND };
			const requirement2 = { freshness: 4 * MINUTE, timeout: 3 * SECOND };
			const resourceState = { lastReceived: threeMinutesAgo };

			const request = new ResourceRequest( requirement1, resourceState, 'resource1', 'read', undefined, tenSecondsAgo );
			expect( request.getStatus( now ) ).toBe( STATUS.unnecessary );

			expect( request.append( requirement2, resourceState, undefined, now ) ).toBeFalsy();
			expect( request.getStatus( now ) ).toBe( STATUS.unnecessary );
		} );

		it( 'adds data to request', () => {
			const request = new ResourceRequest( {}, {}, 'resource1', 'update', { field1: 'value1' }, now );
			expect( request.data ).toEqual( { field1: 'value1' } );

			expect( request.append( {}, {}, { field2: 'value2' }, now ) ).toBeTruthy();
			expect( request.data ).toEqual( { field1: 'value1', field2: 'value2' } );
		} );

		it( 'overwrites existing data in request', () => {
			const request = new ResourceRequest( {}, {}, 'resource1', 'update', { field1: 'value1', field2: 'value2' }, now );
			expect( request.data ).toEqual( { field1: 'value1', field2: 'value2' } );

			expect( request.append( {}, {}, { field2: 'abc' }, now ) ).toBeTruthy();
			expect( request.data ).toEqual( { field1: 'value1', field2: 'abc' } );
		} );
	} );
} );
