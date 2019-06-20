import ApiClient from '../../client';
import { isDevInfoEnabled, updateDevInfo } from '../';

describe( 'devinfo', () => {
    describe( 'isDevInfoEnabled', () => {
        it( 'should be disabled by default', () => {
            expect( isDevInfoEnabled() ).toBeFalsy();
        } )

        it( 'should enable when the window global is true', () => {
            global.window.__FRESH_DATA_DEV_INFO__ = true;
            expect( isDevInfoEnabled() ).toBeTruthy();
        } );

        it( 'should disbale when the window global is false', () => {
            global.window.__FRESH_DATA_DEV_INFO__ = false;
            expect( isDevInfoEnabled() ).toBeFalsy();
        } );
    } );

    describe( 'updateDevInfo', () => {
        it( 'should not have window.freshData set by default', () => {
            expect( global.window.freshData ).toBeUndefined();
        } );

        it( 'should not set window.freshData when devinfo is not enabled', () => {
            const apiSpec = { name: 'apiSpecName' };
            const client = new ApiClient( apiSpec );
            updateDevInfo( client );
            expect( global.window.freshData ).toBeUndefined();
        } );

        it( 'should set window.freshData when devinfo is enabled', () => {
            const apiSpec = { name: 'myapi' };
            const client = new ApiClient( apiSpec );

            global.window.__FRESH_DATA_DEV_INFO__ = true;

            updateDevInfo( client );
            expect( global.window.freshData ).not.toBeUndefined();
            expect( global.window.freshData.myapi ).not.toBeUndefined();
        } );

        it( 'should not create window.freshData twice', () => {
            const apiSpec = { name: 'myapi' };
            const client = new ApiClient( apiSpec );

            global.window.__FRESH_DATA_DEV_INFO__ = true;

            updateDevInfo( client );
            const devInfo = global.window.freshData;

            updateDevInfo( client );
            expect( global.window.freshData ).toBe( devInfo );
        } );
    } );
} );