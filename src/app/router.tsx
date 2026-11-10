import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell/AppShell';
import { InteractionPage } from './routes/InteractionPage';
import { LandingPage } from './routes/LandingPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { RequireRole } from './routes/RequireRole';
import {
  AdminPage,
  CaseDetailPage,
  CaseSearchPage,
  DocumentPage,
  ProviderProfilePage,
  VeteranProfilePage,
} from './routes/stubPages';

/** Routes (docs/03). Screen pop goes straight to /interaction/:id. */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'interaction/:id', element: <InteractionPage /> },
      { path: 'cases', element: <CaseSearchPage /> },
      { path: 'cases/:id', element: <CaseDetailPage /> },
      { path: 'profiles/veteran/:id', element: <VeteranProfilePage /> },
      { path: 'profiles/provider/:id', element: <ProviderProfilePage /> },
      { path: 'documents/:id', element: <DocumentPage /> },
      {
        path: 'admin',
        element: (
          <RequireRole roles={['admin']} thing="administration">
            <AdminPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
