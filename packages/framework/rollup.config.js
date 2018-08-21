import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import { uglify } from 'rollup-plugin-uglify';

const env = process.env.NODE_ENV;

const config = {
	input: 'src/index.js',
	external: [ 'debug', 'lodash' ],
	output: {
		format: 'umd',
		name: 'FreshDataFramework',
		globals: {
			debug: 'Debug',
			lodash: '_',
			'prop-types': 'PropTypes',
			react: 'React',
			'react-dom': 'ReactDom',
			'react-redux': 'ReactRedux',
			redux: 'Redux',
		},
	},
	plugins: [
		nodeResolve(),
		babel( {
			babelrc: false,
			exclude: '**/node_modules/**',
			presets: [
				[ 'env', { modules: false } ],
				'react',
				'stage-2',
			],
			plugins: [
				'external-helpers',
			],
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
		} )
	);
}

export default config;
