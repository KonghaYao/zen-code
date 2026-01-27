import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: [
      'packages/**/*.test.ts',
      'zen-code/src/**/*.{test,testx}.{ts,tsx}',
    ],
    setupFiles: ['./zen-code/src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
  },
});
