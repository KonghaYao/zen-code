import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Packages
  'packages/config/vitest.config.ts',
  'packages/agent/vitest.config.ts',
  'packages/union-client/vitest.config.ts',
  // Apps
  'zen-code/vitest.config.ts',
]);
