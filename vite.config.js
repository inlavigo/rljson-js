import { defineConfig } from 'vite';
import eslintPlugin from 'vite-plugin-eslint';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [eslintPlugin()],
  test: {
    globals: false, // If you want to use global functions such as "describe" and "it"
    environment: 'jsdom', // Standard environment for tests
    exclude: [...configDefaults.exclude, '**/coverage/**'], // Exclude tests (optional)
    coverage: {
      enabled: false, // Enable coverage, also when no --coverage flag is provided
      provider: 'v8', // v8, c8 Or 'istanbul' if you want coverage
      exclude: [
        ...configDefaults.coverage.exclude,
        'examples/**',
        '**/coverage/**',
      ], // Exclude the "examples" folder from coverage
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
        perFile: true,
        100: true,
      },
    },
  },
});
