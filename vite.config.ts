/// <reference types="vitest" />
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import dtsPlugin from 'vite-plugin-dts';
import { appendFile, readFile } from "fs/promises";
import { isAbsolute } from "node:path";

export default defineConfig({
	plugins: [
		cssInjectedByJsPlugin(),
		dtsPlugin({
			clearPureImport: false,
			rollupTypes: true,
			async afterBuild() {
				// Due to https://github.com/microsoft/rushstack/issues/1709, our module augmentations are lost during
				// the type rollup. As an ugly workaround, we simply append them here.
				const filterFile = await readFile("./src/injections-types.mts");
				await appendFile("./dist/L.DraggableLines.d.ts", filterFile);
			},
		})
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
			external: (id) => !id.startsWith("./") && !id.startsWith("../") && /* resolved internal modules */ !isAbsolute(id)
		}
	},
	resolve: {
		alias: {
			'leaflet-draggable-lines': './src/index.ts'
		}
	},
	test: {
		environment: 'happy-dom'
	}
});
