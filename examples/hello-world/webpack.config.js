const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require( 'path' );

module.exports = {
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: { loader: 'babel-loader' }
			},
			{
				test: /\.html$/,
				use: [
					{
						loader: 'html-loader',
						options: { minimize: true }
					}
				]
			}
		]
	},
	plugins: [
		new HtmlWebPackPlugin( {
			template: './src/index.html',
			filename: './index.html'
		} )
	]
};
