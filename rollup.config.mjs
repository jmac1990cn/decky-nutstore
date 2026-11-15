import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import importAssets from 'rollup-plugin-import-assets';
import { readFileSync } from 'fs';

// Read plugin.json without relying on an import-attribute syntax (the old
// `assert { type: "json" }` was removed in Node 22, while `with { ... }`
// is unavailable on older Node). This keeps the build working on any version.
const plugin = JSON.parse(readFileSync(new URL('./plugin.json', import.meta.url)));

export default defineConfig({
  input: './src/index.tsx',
  plugins: [
    commonjs(),
    nodeResolve(),
    typescript(),
    json(),
    replace({
      preventAssignment: false,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    importAssets({
      publicPath: `http://127.0.0.1:1337/plugins/${plugin.name}/`
    })
  ],
  context: 'window',
  external: ['react', 'react-dom', 'decky-frontend-lib'],
  output: {
    file: 'dist/index.js',
    globals: {
      react: 'SP_REACT',
      'react-dom': 'SP_REACTDOM',
      'decky-frontend-lib': 'DFL'
    },
    format: 'iife',
    exports: 'default',
  },
});
