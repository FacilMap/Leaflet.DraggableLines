import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import dtsPlugin from 'vite-plugin-dts';

const format = process.env.FORMAT === 'umd' ? 'umd' : 'es';

export default defineConfig({
	plugins: [
		cssInjectedByJsPlugin(),
		...(format === 'es' ? [dtsPlugin()] : [])
	],
	build: {
		sourcemap: true,
		minify: false,
		emptyOutDir: false,
		lib: {
			entry: `./src/index${format === 'umd' ? '-umd' : ''}.ts`,
			name: 'L.DraggableLines',
			fileName: (format) => `L.DraggableLines.${format === 'umd' ? 'js' : 'mjs'}`,
			formats: [format]
		},
		rollupOptions: {
			output: {
				globals: {
					'leaflet': 'L',
					'leaflet-geometryutil': 'L.GeometryUtil'
				}
			},
			external: ['leaflet', 'leaflet-geometryutil']
		}
	}
});
