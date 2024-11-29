import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Wenn du globale Funktionen wie "describe" und "it" verwenden möchtest
    environment: 'jsdom', // Standardumgebung für Tests
    exclude: [...configDefaults.exclude], // Tests ausschließen (optional)
    coverage: {
      enabled: true,
      provider: 'v8', // v8, c8 Oder 'istanbul', wenn du Coverage möchtest
      exclude: [...configDefaults.coverage.exclude, 'examples/**'], // Exclude the "examples" folder from coverage
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
