import { FreshDataApi } from 'fresh-data';

const greetings = [
	'Hello world!',
	'¡Hola Mundo!',
	'你好，世界',
	'Bonjour le monde!',
	'ഹലോ വേൾഡ്',
	'Olá Mundo!',
	'Hej Verden!',
	'Hallo Welt!',
	'こんにちは世界',
	'Ciao mondo!',
	'Hola món!',
	'Γειά σου Κόσμε',
	'Witaj świecie!',
	'Ahoj světe!',
	'שלום עולם',
	'Hei Verden!',
	'Hallo Wereld!',
	'Привет мир!',
	'Chào thế giới!',
	'Здраво Свете!',
	'مرحبا بالعالم',
	'안녕 세상',
	'สวัสดีชาวโลก',
	'Hej världen!',
	'नमस्ते दुनिया',
	'Hei maailma!',
	'హలో వరల్డ్',
];

// For demo purposes, track each request count and give an extra greeting each time.
let requestCount = 0;

export default class TestApi extends FreshDataApi {
	static methods = {
		get: ( clientKey ) => ( endpointPath ) => ( params ) => { // eslint-disable-line no-unused-vars
			return new Promise( ( resolve ) => {
				requestCount++;
				const valueCount = Math.min( requestCount, greetings.length );
				const values = greetings.slice( 0, valueCount );
				resolve( values );
			} );
		},
	}

	static operations = {
		read: ( { get } ) => ( resourceNames ) => {
			const requests = [];
			resourceNames.forEach( resourceName => {
				if ( 'greetings' === resourceName ) {
					const request = get( [ 'greetings' ] )()
						.then( data => {
							const resources = { greetings: { data } };
							return resources;
						} )
						.catch( error => ( { greetings: { error } } ) );
					requests.push( request );
				}
			} );
			return requests;
		}
	}

	static selectors = {
		getGreetings: ( getData, requireData ) => ( requirement ) => {
			const resourceName = 'greetings';
			requireData( requirement, resourceName );
			return getData( resourceName ) || [];
		}
	}
}
