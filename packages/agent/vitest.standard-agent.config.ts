import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/standard-agent/__tests__/**/*.test.ts'],
    // standard-agent 测试不需要 setup.ts 中的 mock
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/standard-agent/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/dist/**',
        '**/node_modules/**',
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
});
