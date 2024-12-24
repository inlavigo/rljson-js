// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'gg-db',
      fileName: (format) => `gg-db.${format}.js`,
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
});
