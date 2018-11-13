import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

const env = process.env.NODE_ENV;

const config = {
	input: 'src/index.js',
	external: Object.keys( pkg.peerDependencies || {} ),
	output: {
		format: 'umd',
		name: 'FreshDataFramework',
		globals: {
			debug: 'Debug',
			lodash: '_',
		},
	},
	plugins: [
		nodeResolve(),
		babel( {
			exclude: '**/node_modules/**',
			runtimeHelpers: true,
		} ),
		replace( {
			'process.env.NODE_ENV': JSON.stringify( env ),
		} ),
		commonjs(),
	],
};

if ( 'production' === env ) {
	config.plugins.push(
		uglify( {
			compress: {
				pure_getters: true, // eslint-disable-line camelcase
				unsafe: true,
				unsafe_comps: true, // eslint-disable-line camelcase
				warnings: false,
			},
			sourceMap: false,
		} )
	);
}

export default config;
