const { NODE_ENV, BABEL_ENV } = process.env;
const test = 'test' === NODE_ENV;
const cjs = 'commonjs' === BABEL_ENV;
const loose = true;

module.exports = {
	presets: [ [ '@babel/env', { loose, modules: false } ] ],
	plugins: [
		[ '@babel/proposal-class-properties', { loose } ],
		[ '@babel/proposal-object-rest-spread', { loose } ],
		[ '@babel/transform-async-to-generator' ],
		( cjs || test ) && [ '@babel/transform-modules-commonjs', { loose } ],
		[ '@babel/transform-runtime', { useESModules: ! ( cjs || test ) } ],
	].filter( Boolean ),
	ignore: [
		! test && '**/__tests__/**',
	].filter( Boolean ),
};
