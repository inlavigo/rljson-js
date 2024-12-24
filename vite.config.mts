// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'rljson',
      fileName: (format) => `rljson.${format}.js`,
      formats: ['es', 'cjs', 'umd'],
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
});
