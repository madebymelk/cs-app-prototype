import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createQueryClient, Providers } from '@/app/providers';

/** Renders a component with a fresh query client (no retries, no polling). */
export function renderWithClient(ui: ReactElement) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, refetchInterval: false } });
  return { ...render(<Providers client={client}>{ui}</Providers>), client };
}
