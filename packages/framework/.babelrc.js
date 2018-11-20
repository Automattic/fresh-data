const { NODE_ENV, BABEL_ENV } = process.env;
const test = 'test' === NODE_ENV;
const cjs = 'commonjs' === BABEL_ENV;
const loose = true;

module.exports = {
	presets: [ [ '@babel/env', { loose, modules: false } ] ],
	plugins: [
		[ '@babel/plugin-proposal-class-properties', { loose } ],
		[ '@babel/plugin-proposal-object-rest-spread', { loose } ],
		[ '@babel/plugin-transform-async-to-generator' ],
		( cjs || test ) && [ '@babel/plugin-transform-modules-commonjs', { loose } ],
		[
			'@babel/plugin-transform-runtime',
			{ corejs: '2', useESModules: ! ( cjs || test ) },
		],
	].filter( Boolean ),
	ignore: [
		! test && '**/__tests__/**',
	].filter( Boolean ),
};
