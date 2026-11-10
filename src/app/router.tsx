import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell/AppShell';
import { WorkspacePage } from '@/features/workspace/WorkspacePage';
import { LandingPage } from './routes/LandingPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { RequirePermission } from './routes/RequirePermission';
import { CASE_SEARCH_ACCESS } from '@/config/navigation';
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
      { path: 'interaction/:id', element: <WorkspacePage /> },
      {
        path: 'cases',
        element: (
          <RequirePermission anyOf={CASE_SEARCH_ACCESS} thing="case search">
            <CaseSearchPage />
          </RequirePermission>
        ),
      },
      {
        path: 'cases/:id',
        element: (
          <RequirePermission anyOf={CASE_SEARCH_ACCESS} thing="this case">
            <CaseDetailPage />
          </RequirePermission>
        ),
      },
      { path: 'profiles/veteran/:id', element: <VeteranProfilePage /> },
      { path: 'profiles/provider/:id', element: <ProviderProfilePage /> },
      { path: 'documents/:id', element: <DocumentPage /> },
      {
        path: 'admin',
        element: (
          <RequirePermission anyOf={['canAdminister']} thing="administration">
            <AdminPage />
          </RequirePermission>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** The static demo (published as an Artifact) can't own the URL path, so it routes in memory. */
export const isDemoBuild = import.meta.env.VITE_DEMO === 'true';
export const createAppRouter = () => (isDemoBuild ? createMemoryRouter(routes) : createBrowserRouter(routes));
