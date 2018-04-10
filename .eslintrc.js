const { escapeRegExp } = require( 'lodash' );
const { version } = require( './package' );

/**
 * Regular expression string matching a SemVer string with equal major/minor to
 * the current package version. Used in identifying deprecations.
 *
 * @type {string}
 */
const majorMinorRegExp = escapeRegExp( version.replace( /\.\d+$/, '' ) ) + '(\\.\\d+)?';

module.exports = {
	root: true,
	parser: 'babel-eslint',
	extends: [
		'wordpress',
		'plugin:wordpress/esnext',
		'plugin:react/recommended',
		'plugin:jsx-a11y/recommended',
		'plugin:jest/recommended',
	],
	env: {
		browser: false,
		es6: true,
		node: true,
		'jest/globals': true,
	},
	parserOptions: {
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
		},
	},
	globals: {
		window: true,
		document: true,
	},
	plugins: [
		'wordpress',
		'react',
		'jsx-a11y',
		'jest',
	],
	rules: {
		'comma-dangle': 'off',
		'jsx-a11y/media-has-caption': 'off',
		'jsx-a11y/no-noninteractive-tabindex': 'off',
		'jsx-a11y/role-has-required-aria-props': 'off',
		'jsx-quotes': 'error',
		'key-spacing': 'error',
		'keyword-spacing': 'error',
		'lines-around-comment': 'off',
		'no-alert': 'error',
		'no-bitwise': 'error',
		'no-caller': 'error',
		'no-console': 'error',
		'no-debugger': 'error',
		'no-dupe-args': 'error',
		'no-dupe-keys': 'error',
		'no-duplicate-case': 'error',
		'no-else-return': 'error',
		'no-eval': 'error',
		'no-extra-semi': 'error',
		'no-fallthrough': 'error',
		'no-lonely-if': 'error',
		'no-mixed-operators': 'error',
		'no-mixed-spaces-and-tabs': 'error',
		'no-multiple-empty-lines': [ 'error', { max: 1 } ],
		'no-multi-spaces': 'error',
		'no-multi-str': 'off',
		'no-negated-in-lhs': 'error',
		'no-nested-ternary': 'error',
		'no-redeclare': 'error',
		'no-restricted-syntax': [
			'error',
			{
				selector: 'CallExpression[callee.name=/^__|_n|_x$/]:not([arguments.0.type=/^Literal|BinaryExpression$/])',
				message: 'Translate function arguments must be string literals.',
			},
			{
				selector: 'CallExpression[callee.name=/^_n|_x$/]:not([arguments.1.type=/^Literal|BinaryExpression$/])',
				message: 'Translate function arguments must be string literals.',
			},
			{
				selector: 'CallExpression[callee.name=_nx]:not([arguments.2.type=/^Literal|BinaryExpression$/])',
				message: 'Translate function arguments must be string literals.',
			},
		],
		'no-shadow': 'error',
		'no-undef': 'error',
		'no-undef-init': 'error',
		'no-unreachable': 'error',
		'no-unsafe-negation': 'error',
		'no-unused-expressions': 'error',
		'no-unused-vars': 'error',
		'no-useless-return': 'error',
		'no-whitespace-before-property': 'error',
		'object-curly-spacing': [ 'error', 'always' ],
		'padded-blocks': [ 'error', 'never' ],
		'quote-props': [ 'error', 'as-needed' ],
		'react/display-name': 'off',
		'react/jsx-curly-spacing': [ 'error', {
			when: 'always',
			children: true,
		} ],
		'react/jsx-equals-spacing': 'error',
		'react/jsx-indent': [ 'error', 'tab' ],
		'react/jsx-indent-props': [ 'error', 'tab' ],
		'react/jsx-key': 'error',
		'react/jsx-tag-spacing': 'error',
		'react/jsx-uses-react': 'error',
		'react/jsx-uses-vars': 'error',
		'react/no-children-prop': 'off',
		'react/no-find-dom-node': 'warn',
		'react/prop-types': 'off',
		'react/react-in-jsx-scope': 'error',
		semi: 'error',
		'semi-spacing': 'error',
		'space-before-blocks': [ 'error', 'always' ],
		'space-before-function-paren': [ 'error', {
			anonymous: 'never',
			named: 'never',
			asyncArrow: 'always',
		} ],
		'space-in-parens': [ 'error', 'always' ],
		'space-infix-ops': [ 'error', { int32Hint: false } ],
		'space-unary-ops': [ 'error', {
			overrides: {
				'!': true,
				yield: true,
			},
		} ],
		'valid-jsdoc': [ 'error', {
			prefer: {
				arg: 'param',
				argument: 'param',
				extends: 'augments',
				returns: 'return',
			},
			preferType: {
				array: 'Array',
				bool: 'boolean',
				Boolean: 'boolean',
				float: 'number',
				Float: 'number',
				int: 'number',
				integer: 'number',
				Integer: 'number',
				Number: 'number',
				object: 'Object',
				String: 'string',
				Void: 'void',
			},
			requireParamDescription: false,
			requireReturn: false,
		} ],
		'valid-typeof': 'error',
		yoda: 'off',
	},
};

