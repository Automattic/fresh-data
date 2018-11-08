const { NODE_ENV, BABEL_ENV } = process.env;
const test = 'test' === NODE_ENV;
const cjs = 'commonjs' === BABEL_ENV;
const loose = true;

module.exports = {
	presets: [ [ '@babel/env', { loose } ] ],
	plugins: [
		[ '@babel/plugin-proposal-class-properties', { loose } ],
		[ '@babel/plugin-proposal-object-rest-spread', { loose } ],
		[ '@babel/plugin-transform-async-to-generator' ],
		'@babel/plugin-transform-react-jsx',
		cjs && [ '@babel/plugin-transform-modules-commonjs', { loose } ],
		[ '@babel/plugin-transform-runtime', { useESModules: ! ( cjs || test ) } ],
	].filter( Boolean ),
	ignore: [
		! test && '**/__tests__/**',
	].filter( Boolean ),
};
