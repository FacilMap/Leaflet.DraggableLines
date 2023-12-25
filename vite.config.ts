import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import dtsPlugin from 'vite-plugin-dts';

export default defineConfig({
	plugins: [
		cssInjectedByJsPlugin(),
		dtsPlugin({ clearPureImport: false, rollupTypes: true })
	],
	build: {
		sourcemap: true,
		minify: false,
		lib: {
			entry: `./src/index.ts`,
			name: 'L.DraggableLines',
			fileName: () => "L.DraggableLines.js",
			formats: ["es"]
		},
		rollupOptions: {
			external: (id) => !id.startsWith("./") && !id.startsWith("../") && /* resolved internal modules */ !id.startsWith("/")
		}
	},
	resolve: {
		alias: {
			'leaflet-draggable-lines': './src/index.ts'
		}
	}
});
