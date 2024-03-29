import { Configuration } from "webpack";
import svgToMiniDataURI from "mini-svg-data-uri";

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env: any, argv: any): Configuration => {
	const isDev = argv.mode == "development";

	return {
		output: {
			filename: "L.DraggableLines.js",
			path: __dirname + "/dist/",
			library: ["L", "DraggableLines"],
			libraryExport: "DraggableLines",
			libraryTarget: "umd"
		},
		resolve: {
			extensions: [ ".js", ".ts" ]
		},
		mode: isDev ? "development" : "production",
		devtool: isDev ? "eval-cheap-source-map" : "source-map",
		module: {
			rules: [
				{
					resource: { and: [ /\.ts/, [
						__dirname + "/src/"
					] ] },
					loader: "ts-loader"
				},
				{
					test: /\.css$/,
					use: [ 'style-loader', 'css-loader' ]
				},
				{
					test: /\.svg$/i,
					type: 'asset/inline',
					generator: {
						dataUrl: (content: any) => svgToMiniDataURI(content.toString())
					}
				},
				{
					test: /\.png$/i,
					type: 'asset/inline'
				}
			]
		},
		externals : {
			leaflet: {
				commonjs: 'leaflet',
				commonjs2: 'leaflet',
				amd: 'leaflet',
				root: 'L'
			},
			"leaflet-geometryutil": {
				commonjs: "leaflet-geometryutil",
				commonjs2: "leaflet-geometryutil",
				amd: "leaflet-geometryutil",
				root: ["L", "GeometryUtil"]
			}
		},
		plugins: [
			//new BundleAnalyzerPlugin()
		],
		devServer: {
			publicPath: "/dist",
			disableHostCheck: true,
			injectClient: false // https://github.com/webpack/webpack-dev-server/issues/2484
		}
	};
};
