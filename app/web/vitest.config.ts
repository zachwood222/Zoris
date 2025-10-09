import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup-tests.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: process.env.CI ? { junit: 'test-results/vitest-junit.xml' } : undefined
  },
  esbuild: {
    loader: 'tsx',
    jsx: 'automatic'
  }
});
