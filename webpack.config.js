const path = require( 'path' );

module.exports = {
	module: {
		rules: [
			{ test: /\.js$/, use: 'babel-loader', exclude: /node_modules/ },
		]
	},
	output: {
		library: 'fresh-data',
		libraryTarget: 'umd',
		path: path.resolve( __dirname, 'dist' ),
		filename: 'fresh-data.js',
	}
};
