// @license
// Copyright (c) 2025 CARAT Gesellschaft für Organisation
// und Softwareentwicklung mbH. All Rights Reserved.
//
// Use of this source code is governed by terms that can be
// found in the LICENSE file in the root of this package.
import { resolve } from 'path';
// vite.config.ts
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';


export default defineConfig({
  plugins: [dts({ include: ['src/*'] })],

  build: {
    copyPublicDir: false,
    minify: false,
    // sourcemap: 'inline',

    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      // name: 'rljson',
      // fileName: (format) => `ds-catalog-db.${format}.js`,
      // formats: ['es', 'cjs', 'umd'],
      formats: ['es'],
    },
    rollupOptions: {
      external: ['gg-json-hash'],
      output: {
        globals: {},
      },
    },
  },
});
