import { vi } from 'vitest';

// Mock Ink terminal
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    render: vi.fn(),
    Box: 'Box',
    Text: 'Text',
  };
});

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    use: vi.fn(),
  };
});
