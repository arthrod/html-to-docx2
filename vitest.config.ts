import { defineConfig } from 'vitest/config'

const COVERAGE_EXCLUDE = [
  '**/*.d.ts',
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/node_modules/**',
  'dist/**',
  'coverage/**',
] as const
const COVERAGE_INCLUDE = ['src/**/*.ts', 'index.ts'] as const
const COVERAGE_REPORTERS = ['text', 'lcov', 'html'] as const
const TEST_EXCLUDE = ['tests/examples/**'] as const
const TEST_INCLUDE = ['tests/**/*.test.js'] as const

export default defineConfig({
  test: {
    coverage: {
      exclude: COVERAGE_EXCLUDE,
      include: COVERAGE_INCLUDE,
      provider: 'v8',
      reporter: COVERAGE_REPORTERS,
    },
    environment: 'node',
    globals: true,
    exclude: TEST_EXCLUDE,
    include: TEST_INCLUDE,
    testTimeout: 10000,
  },
})
