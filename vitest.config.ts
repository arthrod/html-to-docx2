import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: [
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/node_modules/**',
        'dist/**',
        'coverage/**',
      ],
      include: ['html-to-docx_ts/**/*.ts', 'index.ts'],
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
    },
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    testTimeout: 10000,
  },
})
