import { isEmpty } from 'lodash';
import Scheduler, {
	getRequestsByOperation,
	combineRequestData,
	sendOperation
} from '../scheduler';
import ResourceRequest, { STATUS } from '../resource-request';
import { MINUTE, SECOND } from '../../utils/constants';

// TODO: Handle timeouts

describe( 'getRequestsByOperation', () => {
	const now = new Date();

	it( 'returns an empty object when no requests are given', () => {
		const requestsByOperation = getRequestsByOperation( [] );
		expect( isEmpty( requestsByOperation ) ).toBeTruthy();
	} );

	it( 'returns an object with requests sorted by operation', () => {
		const read1 = new ResourceRequest( {}, {}, 'resource1', 'read', { one: 1 }, now );
		const read2 = new ResourceRequest( {}, {}, 'resource2', 'read', { two: 2 }, now );
		const write1 = new ResourceRequest( {}, {}, 'resource1', 'write', { one: 1 }, now );
		const write2 = new ResourceRequest( {}, {}, 'resource2', 'write', { two: 2 }, now );

		const requestsByOperation = getRequestsByOperation( [ read1, read2, write1, write2 ] );

		expect( Object.keys( requestsByOperation ).length ).toBe( 2 );
		expect( requestsByOperation.read ).toEqual( [ read1, read2 ] );
		expect( requestsByOperation.write ).toEqual( [ write1, write2 ] );
	} );
} );

describe( 'combineRequestData', () => {
	const now = new Date();

	it( 'should pass through single sets of data for requests', () => {
		const request1 = new ResourceRequest( {}, {}, 'resource1', 'write', { one: 1 }, now );
		const request2 = new ResourceRequest( {}, {}, 'resource2', 'write', { two: 2 }, now );

		const data = combineRequestData( [ request1, request2 ] );

		expect( Object.keys( data ).length ).toBe( 2 );
		expect( data.resource1 ).toEqual( { one: 1 } );
		expect( data.resource2 ).toEqual( { two: 2 } );
	} );

	it( 'should combine multiple sets of data for requests', () => {
		const request1a = new ResourceRequest( {}, {}, 'resource1', 'write', { oneA: 1 }, now );
		const request1b = new ResourceRequest( {}, {}, 'resource1', 'write', { oneB: 1 }, now );
		const request2 = new ResourceRequest( {}, {}, 'resource2', 'write', { two: 2 }, now );

		const data = combineRequestData( [ request1a, request1b, request2 ] );

		expect( Object.keys( data ).length ).toBe( 2 );
		expect( data.resource1 ).toEqual( { oneA: 1, oneB: 1 } );
		expect( data.resource2 ).toEqual( { two: 2 } );
	} );

	it( 'should handle requests with no data', () => {
		const request1a = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, now );
		const request1b = new ResourceRequest( {}, {}, 'resource1', 'read', null, now );

		const data = combineRequestData( [ request1a, request1b ] );

		expect( data ).toBeFalsy();
	} );
} );

describe( 'sendOperation', () => {
	const now = new Date();
	const oneSecondAgo = new Date( now.getTime() - ( 1 * SECOND ) );

	it ( 'should not swallow throw errors thrown by the oepration', () => {
		const errorRequest = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, oneSecondAgo );
		const operation = () => {
			throw { error: true };
		};

		const promise = sendOperation( operation, [ errorRequest ], () => {}, now );

		return promise.catch( ( thrownError ) => {
			expect( thrownError ).toEqual( { error: true } );
		} );
	} );

	it ( 'should send an operation without data', () => {
		const request1a = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, oneSecondAgo );
		const request1b = new ResourceRequest( {}, {}, 'resource1', 'read', undefined, oneSecondAgo );
		const request2 = new ResourceRequest( {}, {}, 'resource2', 'read', undefined, oneSecondAgo );
		const operation = jest.fn();
		const dataReceived = jest.fn();
		operation.mockReturnValue( {
			resource1: { data: 1 },
			resource2: { data: 2 }
		} );

		const promise = sendOperation( operation, [ request1a, request1b, request2 ], dataReceived, now );

		expect( request1a.timeRequested ).toBe( now );
		expect( request1b.timeRequested ).toBe( now );
		expect( request2.timeRequested ).toBe( now );

		return promise.then( () => {
			expect( operation ).toHaveBeenCalledWith( [ 'resource1', 'resource2' ], undefined );

			expect( dataReceived ).toHaveBeenCalledWith( {
				resource1: { data: 1 },
				resource2: { data: 2 },
			} );

			expect( request1a.getStatus() ).toBe( STATUS.complete );
			expect( request1a.promise ).toBeFalsy();
			expect( request1a.timeCompleted.getTime() ).toBeGreaterThan( now.getTime() );

			expect( request1b.getStatus() ).toBe( STATUS.complete );
			expect( request1b.promise ).toBeFalsy();
			expect( request1b.timeCompleted.getTime() ).toBeGreaterThan( now.getTime() );

			expect( request2.getStatus() ).toBe( STATUS.complete );
			expect( request2.promise ).toBeFalsy();
			expect( request2.timeCompleted.getTime() ).toBeGreaterThan( now.getTime() );
		} );
	} );

	it ( 'should send an operation with data', () => {
		const request1a = new ResourceRequest( {}, {}, 'resource1', 'write', { oneA: 1 }, oneSecondAgo );
		const request1b = new ResourceRequest( {}, {}, 'resource1', 'write', { oneB: 1 }, oneSecondAgo );
		const request2 = new ResourceRequest( {}, {}, 'resource2', 'write', { two: 2 }, oneSecondAgo );
		const operation = jest.fn();
		const dataReceived = jest.fn();
		operation.mockReturnValue( {
			resource1: { data: { oneA: 1, oneB: 1 } },
			resource2: { data: { two: 2 } },
		} );

		const promise = sendOperation( operation, [ request1a, request1b, request2 ], dataReceived, now );

		expect( request1a.timeRequested ).toBe( now );
		expect( request1b.timeRequested ).toBe( now );
		expect( request2.timeRequested ).toBe( now );

		return promise.then( () => {
			expect( operation ).toHaveBeenCalledWith(
				[ 'resource1', 'resource2' ],
				{
					resource1: { oneA: 1, oneB: 1 },
					resource2: { two: 2 }
				}
			);

			expect( dataReceived ).toHaveBeenCalledWith( {
				resource1: { data: { oneA: 1, oneB: 1 } },
				resource2: { data: { two: 2 } },
			} );

			expect( request1a.getStatus() ).toBe( STATUS.complete );
			expect( request1a.promise ).toBeFalsy();
			expect( request1a.timeCompleted.getTime() ).toBeGreaterThan( now.getTime() );

			expect( request1b.getStatus() ).toBe( STATUS.complete );
			expect( request1b.promise ).toBeFalsy();
			expect( request1b.timeCompleted.getTime() ).toBeGreaterThan( now.getTime() );

			expect( request2.getStatus() ).toBe( STATUS.complete );
			expect( request2.promise ).toBeFalsy();
			expect( request2.timeCompleted.getTime() ).toBeGreaterThan( now.getTime() );
		} );
	} );
} );

describe( 'Scheduler', () => {
	const now = new Date();
	const threeMinutesAgo = new Date( now.getTime() - ( 3 * MINUTE ) );
	const fourMinutesAgo = new Date( now.getTime() - ( 4 * MINUTE ) );

	describe( 'constructor', () => {
		it( 'creates an array of requests', () => {
			const scheduler = new Scheduler( {}, () => {}, () => {} );

			expect( scheduler.requests ).toEqual( [] );
		} );

		it( 'initializes timeout variables', () => {
			const setTimeout = () => {};
			const clearTimeout = () => {};
			const scheduler = new Scheduler( {}, setTimeout, clearTimeout );

			expect( scheduler.setTimeout ).toBe( setTimeout );
			expect( scheduler.clearTimeout ).toBe( clearTimeout );
			expect( scheduler.timeoutId ).toBe( null );
		} );

		it( 'defaults to window.setTimeout and window.clearTimeout', () => {
			const scheduler = new Scheduler( {} );

			expect( scheduler.setTimeout ).toBe( window.setTimeout );
			expect( scheduler.clearTimeout ).toBe( window.clearTimeout );
		} );
	} );

	describe( 'getNextRequestDelay', () => {
		it( 'returns null when no requests are scheduled/overdue', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			expect( scheduler.getNextRequestDelay() ).toBeNull();

			scheduler.scheduleRequest( {}, {}, 'completeResource', 'read', null, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.complete;

			expect( scheduler.getNextRequestDelay( now ) ).toBeNull();
		} );

		it( 'returns zero when a request is overdue', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest( {}, {}, 'resource1', 'read', null, threeMinutesAgo );

			expect( scheduler.getNextRequestDelay( now ) ).toBe( 0 );
		} );

		it( 'returns a positive number when a request is scheduled', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{ lastReceived: threeMinutesAgo },
				'resource1',
				null,
				now
			);

			expect( scheduler.getNextRequestDelay( now ) / MINUTE ).toBeCloseTo( 2, 2 );
		} );

		it( 'returns zero when a new request is scheduled that is immediately due', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{ lastReceived: threeMinutesAgo },
				'resource1',
				null,
				now
			);
			scheduler.scheduleRequest( {}, {}, 'resource1', null, now );

			expect( scheduler.getNextRequestDelay( now ) ).toBe( 0 );
		} );

		it( 'returns the same number when a new request that is scheduled later is added', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{ lastReceived: threeMinutesAgo },
				'resource1',
				null,
				now
			);
			const delayBefore = scheduler.getNextRequestDelay( now );

			scheduler.scheduleRequest(
				{ freshness: 30 * MINUTE },
				{ lastReceived: fourMinutesAgo },
				'resource1',
				null,
				now
			);
			const delayAfter = scheduler.getNextRequestDelay( now );

			expect( delayAfter ).toBe( delayBefore );
		} );
	} );

	describe( 'updateDelay', () => {
		it( 'Does not stop or set timeout when no requests are scheduled/overdue', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, () => {} );
			scheduler.stop = jest.fn();

			scheduler.updateDelay();

			expect( setTimeout ).not.toHaveBeenCalled();
			expect( scheduler.stop ).not.toHaveBeenCalled();
		} );

		it( 'Sets timeout when a request is scheduled', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, 'resource1', null, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );
			expect( setTimeout.mock.calls[ 0 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 0 ][ 1 ] / MINUTE ).toBeCloseTo( 2, 2 );
		} );

		it( 'Sets zero timeout when a request is overdue', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 2 * MINUTE }, { lastReceived: threeMinutesAgo }, 'resource1', null, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );
			expect( setTimeout.mock.calls[ 0 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 0 ][ 1 ] ).toBe( 0 );
		} );

		it( 'Starts a new timeout when a newer request is scheduled', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, 'resource1', null, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 4 * MINUTE }, { lastReceived: threeMinutesAgo }, 'resource1', null, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 2 );

			expect( setTimeout.mock.calls[ 1 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 1 ][ 1 ] / MINUTE ).toBeCloseTo( 1, 2 );
		} );

		it( 'Starts a new zero timeout when a immediately due request is scheduled', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, 'resource1', null, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 1 );

			scheduler.requests.push(
				new ResourceRequest( {}, {}, 'resource2', null, now )
			);
			scheduler.updateDelay( now );

			expect( setTimeout ).toHaveBeenCalledTimes( 2 );

			expect( setTimeout.mock.calls[ 1 ][ 0 ] ).toBe( scheduler.processRequests );
			expect( setTimeout.mock.calls[ 1 ][ 1 ] ).toBe( 0 );
		} );

		it( 'Does not start a new one if there are no longer any requests scheduled/overdue', () => {
			const setTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, () => {} );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 5 * MINUTE }, { lastReceived: fourMinutesAgo }, 'resource1', null, threeMinutesAgo )
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
			const scheduler = new Scheduler( {}, setTimeout, clearTimeout );

			scheduler.stop();

			expect( clearTimeout ).not.toHaveBeenCalled();
		} );

		it( 'Stops the timer when it is set', () => {
			const setTimeout = () => 123;
			const clearTimeout = jest.fn();
			const scheduler = new Scheduler( {}, setTimeout, clearTimeout );

			scheduler.requests.push(
				new ResourceRequest( { freshness: 5 * MINUTE }, { lastReceived: threeMinutesAgo }, 'resource1', null, now )
			);
			scheduler.updateDelay( now );

			scheduler.stop();

			expect( clearTimeout ).toHaveBeenCalledTimes( 1 );
			expect( clearTimeout ).toHaveBeenCalledWith( 123 );
		} );
	} );

	describe( 'setDataHandlers', () => {
		it( 'sets the data handler functions', () => {
			const dataRequested = () => {};
			const dataReceived = () => {};

			const scheduler = new Scheduler( {}, () => {}, () => {} );
			scheduler.setDataHandlers( dataRequested, dataReceived );

			expect( scheduler.dataRequested ).toBe( dataRequested );
			expect( scheduler.dataReceived ).toBe( dataReceived );
		} );
	} );

	describe( 'scheduleRequest', () => {
		it( 'creates an overdue request when no existing state exists', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest( {}, {}, 'resource1', 'read', null, threeMinutesAgo );
			const request = scheduler.requests[ 0 ];

			expect( request ).not.toBe( undefined );
			expect( request.getStatus( now ) ).toBe( STATUS.overdue );
		} );

		it( 'creates a scheduled request when state exists', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const requirement = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( requirement, resourceState, 'resource1', 'read', now );
			const request = scheduler.requests[ 0 ];

			expect( request ).not.toBe( undefined );
			expect( request.getStatus( now ) ).toBe( STATUS.scheduled );
			expect( request.getTimeLeft( now ) ).toBe( 2 * MINUTE );
		} );

		it( 'updates an existing scheduled request with a new scheduled requirement', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const requirement1 = { freshness: 5 * MINUTE };
			const requirement2 = { freshness: 4 * MINUTE };
			const requirement3 = { freshness: 2 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( requirement1, resourceState, 'resource1', 'read', null, now );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( 2 * MINUTE );

			scheduler.scheduleRequest( requirement2, resourceState, 'resource1', 'read', null, now );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( 1 * MINUTE );

			scheduler.scheduleRequest( requirement3, resourceState, 'resource1', 'read', null, now );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.overdue );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( -( 1 * MINUTE ) );
		} );

		it( 'does not add a new request when an identical previous request is already in flight', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const requirement1 = { freshness: 5 * MINUTE };
			const requirement2 = { freshness: 4 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( requirement1, resourceState, 'resource1', 'read', null, now );
			expect( scheduler.requests.length ).toBe( 1 );
			expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 0 ].getTimeLeft( now ) ).toBe( 2 * MINUTE );

			scheduler.requests[ 0 ].getStatus = () => STATUS.inFlight;
			scheduler.scheduleRequest( requirement2, resourceState, 'resource1', 'read', null, now );

			expect( scheduler.requests.length ).toBe( 1 );
		} );
	} );

	describe( 'scheduleMutationOperation', () => {
		it( 'schedules a single request with data', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			scheduler.scheduleRequest = jest.fn();

			scheduler.scheduleMutationOperation( 'write', [ 'resource1' ], { resource1: { one: 1 } }, now );

			expect( scheduler.scheduleRequest ).toHaveBeenCalledTimes( 1 );
			expect( scheduler.scheduleRequest ).toHaveBeenCalledWith( {}, {}, 'resource1', 'write', { one: 1 }, now );
		} );

		it( 'schedules multiple requests with data', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			scheduler.scheduleRequest = jest.fn();

			scheduler.scheduleMutationOperation( 'write', [ 'resource1', 'resource2' ], { resource1: { one: 1 }, resource2: { two: 2 } }, now );

			expect( scheduler.scheduleRequest ).toHaveBeenCalledTimes( 2 );
			expect( scheduler.scheduleRequest ).toHaveBeenCalledWith( {}, {}, 'resource1', 'write', { one: 1 }, now );
			expect( scheduler.scheduleRequest ).toHaveBeenCalledWith( {}, {}, 'resource2', 'write', { two: 2 }, now );
		} );

		it( 'schedules multiple requests without data', () => {
			const scheduler = new Scheduler( () => {}, () => {}, () => {} );
			scheduler.scheduleRequest = jest.fn();

			scheduler.scheduleMutationOperation( 'read', [ 'resource1', 'resource2' ], undefined, now );

			expect( scheduler.scheduleRequest ).toHaveBeenCalledTimes( 2 );
			expect( scheduler.scheduleRequest ).toHaveBeenCalledWith( {}, {}, 'resource1', 'read', undefined, now );
			expect( scheduler.scheduleRequest ).toHaveBeenCalledWith( {}, {}, 'resource2', 'read', undefined, now );
		} );
	} );

	describe( 'getScheduledRequest', () => {
		it( 'finds a scheduled request', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( requirement1, resourceState, 'resource1', 'read', null );
			const request = scheduler.getScheduledRequest( 'resource1', 'read' );
			expect( request.resourceName ).toBe( 'resource1' );
			expect( request.operation ).toBe( 'read' );
			expect( request.getStatus() ).toBe( STATUS.scheduled );
		} );

		it( 'finds an overdue request', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const requirement1 = { freshness: 2 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( requirement1, resourceState, 'resource1', 'read', null, now );
			const request = scheduler.getScheduledRequest( 'resource1', 'read' );
			expect( request.resourceName ).toBe( 'resource1' );
			expect( request.getStatus() ).toBe( STATUS.overdue );
		} );
	} );

	describe( 'getInFlightRequests', () => {
		it( 'finds any requests for a resource that are currently in-flight', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const requirement1 = { freshness: 5 * MINUTE };
			const resourceState = { lastReceived: threeMinutesAgo };

			scheduler.scheduleRequest( requirement1, resourceState, 'resource1', 'read', null, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.inFlight;

			const requests = scheduler.getInFlightRequests( 'resource1', 'read' );

			expect( requests.length ).toBe( 1 );
			expect( requests[ 0 ].resourceName ).toBe( 'resource1' );
			expect( requests[ 0 ].getStatus() ).toBe( STATUS.inFlight );
		} );
	} );

	describe( 'sendReadyRequests', () => {
		it( 'does nothing when there are no scheduled or overdue requests in queue', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			scheduler.setDataHandlers( dataRequested, dataReceived );

			scheduler.scheduleRequest( {}, {}, 'inFlightResource', 'read', null, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.inFlight;

			scheduler.scheduleRequest( {}, {}, 'timedOutResource', 'read', null, now );
			scheduler.requests[ 1 ].getStatus = () => STATUS.timedOut;

			scheduler.scheduleRequest( {}, {}, 'completeResource', 'read', null, now );
			scheduler.requests[ 2 ].getStatus = () => STATUS.complete;

			scheduler.scheduleRequest( {}, {}, 'failedResource', 'read', null, now );
			scheduler.requests[ 3 ].getStatus = () => STATUS.failed;

			scheduler.scheduleRequest( {}, {}, 'unnecessary', 'read', null, now );
			scheduler.requests[ 4 ].getStatus = () => STATUS.unnecessary;

			return scheduler.sendReadyRequests( now ).then( () => {
				expect( scheduler.requests.length ).toBe( 5 );
				expect( dataRequested ).not.toHaveBeenCalled();
				expect( dataReceived ).not.toHaveBeenCalled();
			} );
		} );

		it( 'calls read with resource names', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{},
				'resource1',
				'read',
				null,
				threeMinutesAgo
			);

			scheduler.scheduleRequest(
				{ freshness: 3 * MINUTE },
				{ lastReceived: fourMinutesAgo },
				'resource2',
				'read',
				null,
				threeMinutesAgo
			);

			expect( scheduler.requests[ 0 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 1 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );

			operations.read.mockReturnValue( Promise.resolve() );
			operations.read.mockReturnValue( Promise.resolve() );

			return scheduler.sendReadyRequests().then( () => {
				expect( operations.read ).toHaveBeenCalledWith(
					[
						scheduler.requests[ 0 ].resourceName,
						scheduler.requests[ 1 ].resourceName,
					],
					undefined
				);
			} );
		} );

		it( 'calls request.requested for each ready request', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{},
				'resource1',
				'read',
				null,
				threeMinutesAgo
			);
			scheduler.scheduleRequest(
				{ freshness: 3 * MINUTE },
				{ lastReceived: fourMinutesAgo },
				'resource2',
				'read',
				null,
				threeMinutesAgo
			);

			expect( scheduler.requests[ 0 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );
			expect( scheduler.requests[ 1 ].getStatus( threeMinutesAgo ) ).toBe( STATUS.scheduled );

			const promise = Promise.resolve();
			operations.read.mockReturnValue( promise );

			return scheduler.sendReadyRequests( now ).then( () => {
				expect( scheduler.requests[ 0 ].getStatus( now ) ).toBe( STATUS.complete );
				expect( scheduler.requests[ 1 ].getStatus( now ) ).toBe( STATUS.complete );
			} );
		} );
	} );

	describe( 'cleanUp', () => {
		it( 'does not clear scheduled requests', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest( {}, {}, 'scheduledResource', 'read', null, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.scheduled;

			expect( scheduler.requests.length ).toBe( 1 );

			scheduler.cleanUp();

			expect( scheduler.requests.length ).toBe( 1 );
			expect( scheduler.requests[ 0 ].getStatus() ).toBe( STATUS.scheduled );
		} );

		it( 'clears out completed and failed requests', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest( {}, {}, 'scheduledResource', 'read', null, now );
			scheduler.requests[ 0 ].getStatus = () => STATUS.scheduled;

			scheduler.scheduleRequest( {}, {}, 'completeResource', 'read', null, now );
			scheduler.requests[ 1 ].getStatus = () => STATUS.complete;

			scheduler.scheduleRequest( {}, {}, 'failedResource', 'read', null, now );
			scheduler.requests[ 2 ].getStatus = () => STATUS.failed;

			expect( scheduler.requests.length ).toBe( 3 );

			scheduler.cleanUp();

			expect( scheduler.requests.length ).toBe( 1 );
			expect( scheduler.requests[ 0 ].getStatus() ).toBe( STATUS.scheduled );
		} );

		it( 'combines data from multiple requests into one operation call', () => {
			const operations = {
				write: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{},
				{},
				'resource1',
				'write',
				{ oneA: '1a' },
				now
			);

			scheduler.scheduleRequest(
				{},
				{},
				'resource1',
				'write',
				{ oneB: '1b' },
				now
			);

			scheduler.scheduleRequest(
				{},
				{},
				'resource2',
				'write',
				{ twoA: '2a' },
				now
			);

			return scheduler.sendReadyRequests( now ).then( () => {
				expect( operations.write ).toHaveBeenCalledWith(
					[ 'resource1', 'resource2' ],
					{ resource1: { oneA: '1a', oneB: '1b' }, resource2: { twoA: '2a' } },
				);
			} );
		} );

		it( 'calls dataRequested with resource names', () => {
			const operations = {
				read: () => {
					return Promise.resolve();
				},
				write: () => {
					return Promise.resolve();
				},
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			scheduler.setDataHandlers( dataRequested, dataReceived );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{},
				'resource1',
				'read',
				null,
				threeMinutesAgo
			);

			scheduler.scheduleRequest(
				{},
				{},
				'resource2',
				'write',
				{},
				threeMinutesAgo
			);

			const promise = scheduler.sendReadyRequests();

			expect( dataRequested ).toHaveBeenCalledTimes( 1 );
			expect( dataRequested ).toHaveBeenCalledWith( [ 'resource1', 'resource2' ] );

			return promise;
		} );

		it( 'calls dataReceived with resource names and results', () => {
			const operations = {
				read: () => {
					return Promise.resolve().then( () => {
						return { resource1: { data: { one: 1 } } };
					} );
				},
				write: () => {
					return [
						Promise.resolve().then( () => {
							return { resource1: { data: { one: 'one' } } };
						} ),
						Promise.resolve().then( () => {
							return { resource2: { data: { two: 'two' } } };
						} ),
					];
				},
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );
			const dataRequested = jest.fn();
			const dataReceived = jest.fn();
			scheduler.setDataHandlers( dataRequested, dataReceived );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE },
				{},
				'resource1',
				'read',
				null,
				threeMinutesAgo
			);

			scheduler.scheduleRequest(
				{},
				{},
				'resource2',
				'write',
				{},
				threeMinutesAgo
			);

			const promise = scheduler.sendReadyRequests();

			return promise.then( () => {
				expect( dataReceived ).toHaveBeenCalledTimes( 3 );
				expect( dataReceived ).toHaveBeenCalledWith(
					{ resource1: { data: { one: 1 } } },
				);
				expect( dataReceived ).toHaveBeenCalledWith(
					{ resource1: { data: { one: 'one' } } },
				);
				expect( dataReceived ).toHaveBeenCalledWith(
					{ resource2: { data: { two: 'two' } } },
				);
			} );
		} );
	} );

	describe( 'resendTimeouts', () => {
		it( 'does nothing when no requests are timed out', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE, timeout: 5 * SECOND },
				{},
				'resource1',
				'read',
				null,
				threeMinutesAgo
			);

			return scheduler.resendTimeouts().then( () => {
				expect( operations.read ).not.toHaveBeenCalled();
			} );
		} );

		it( 're-sends timed out requests', () => {
			const operations = {
				read: jest.fn(),
			};
			const scheduler = new Scheduler( operations, () => {}, () => {} );

			scheduler.scheduleRequest(
				{ freshness: 5 * MINUTE, timeout: 5 * SECOND },
				{},
				'resource1',
				'read',
				null,
				threeMinutesAgo
			);
			scheduler.requests[ 0 ].getStatus = () => STATUS.timedOut;

			operations.read.mockReturnValue( Promise.resolve() );

			return scheduler.resendTimeouts().then( () => {
				expect( operations.read ).toHaveBeenCalledWith(
					[ scheduler.requests[ 0 ].resourceName ],
					undefined
				);
			} );
		} );
	} );

	describe( 'processRequests', () => {
		it( 'should clean up, send ready requests, resend timeouts, and update the delay', () => {
			const scheduler = new Scheduler( {}, () => {}, () => {} );
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
