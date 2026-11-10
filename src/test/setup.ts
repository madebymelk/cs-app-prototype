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

// jsdom has no matchMedia; tests render the wide (≥1280px) workspace unless they override it.
if (typeof (window as { matchMedia?: unknown }).matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
});

afterAll(() => {
  server.close();
});

useDevStore.setState({ latencyMs: 0 });
