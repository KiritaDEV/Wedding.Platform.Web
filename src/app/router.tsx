import { createBrowserRouter } from 'react-router-dom'
import { GuestRoute, ProtectedRoute, RootRedirect } from '../features/auth/RouteGuards'
import { LoginPage } from '../pages/LoginPage'
import { MyEventsPage } from '../pages/MyEventsPage'
import { RegisterPage } from '../pages/RegisterPage'
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout'
import { EventWorkspaceLayout } from '../features/events/workspace/EventWorkspaceLayout'
import { WebsitePage } from '../pages/workspace/WebsitePage'
import { InvitationsPage } from '../pages/workspace/InvitationsPage'
import { EventSettingsPage } from '../pages/workspace/EventSettingsPage'
import { MediaLibraryPage } from '../pages/workspace/MediaLibraryPage'
import { EventOverviewPage } from '../pages/workspace/EventOverviewPage'
import { WebsitePreviewPage } from '../pages/workspace/WebsitePreviewPage'
import { WebsiteProjectsPage } from '../pages/workspace/WebsiteProjectsPage'
import { LegacyWebsiteRedirect } from '../pages/workspace/LegacyWebsiteRedirect'
import { PublicEventSitePage } from '../pages/PublicEventSitePage'
import { PrivateEventSitePage } from '../pages/PrivateEventSitePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/e/:slug',
    element: <PublicEventSitePage />,
  },
  {
    path: '/i/:token',
    element: <PrivateEventSitePage />,
  },
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/events/:eventId/website/preview',
        element: <LegacyWebsiteRedirect preview />,
      },
      {
        path: '/events/:eventId/websites/:projectId/preview',
        element: <WebsitePreviewPage />,
      },
      {
        element: <AuthenticatedLayout />,
        children: [
          {
            path: '/events',
            element: <MyEventsPage />,
          },
          {
            path: '/events/:eventId',
            element: <EventWorkspaceLayout />,
            children: [
              {
                index: true,
                element: <EventOverviewPage />,
              },
              {
                path: 'website',
                element: <LegacyWebsiteRedirect />,
              },
              {
                path: 'websites',
                element: <WebsiteProjectsPage />,
              },
              {
                path: 'websites/:projectId',
                element: <WebsitePage />,
              },
              {
                path: 'media',
                element: <MediaLibraryPage />,
              },
              {
                path: 'invitations',
                element: <InvitationsPage />,
              },
              {
                path: 'settings',
                element: <EventSettingsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
])
