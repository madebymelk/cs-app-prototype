import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createQueryClient, Providers } from './providers';
import { createAppRouter } from './router';

export function App() {
  const [client] = useState(createQueryClient);
  const [router] = useState(createAppRouter);
  return (
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>
  );
}
