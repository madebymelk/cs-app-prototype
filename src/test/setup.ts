import '@testing-library/jest-dom/vitest';
import { toHaveNoViolations } from 'jest-axe';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { useDevStore } from '@/dev/devStore';
import { server } from './server';

expect.extend(toHaveNoViolations);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  sessionStorage.clear();
  useDevStore.setState({ latencyMs: 0 });
});

afterAll(() => {
  server.close();
});

useDevStore.setState({ latencyMs: 0 });
