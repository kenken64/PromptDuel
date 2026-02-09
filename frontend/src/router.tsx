import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoomProvider } from './contexts/RoomContext';
import { GameProvider } from './contexts/GameContext';
import { SupabaseChatProvider } from './contexts/SupabaseChatContext';
import { SupabaseGameProvider } from './contexts/SupabaseGameContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Eagerly loaded pages (small, on critical path)
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';

// Lazy-loaded pages
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ChangePasswordPage = React.lazy(() => import('./pages/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const LobbyPage = React.lazy(() => import('./pages/LobbyPage').then(m => ({ default: m.LobbyPage })));
const WaitingRoom = React.lazy(() => import('./pages/WaitingRoom').then(m => ({ default: m.WaitingRoom })));
const GamePage = React.lazy(() => import('./pages/GamePage').then(m => ({ default: m.GamePage })));
const SpectatorView = React.lazy(() => import('./pages/SpectatorView').then(m => ({ default: m.SpectatorView })));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })));

// Loading fallback
function PageLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#212529', color: '#fff' }}>
      <div className="nes-container is-dark is-rounded" style={{ padding: '2rem' }}>
        <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)' }}>Loading...</p>
      </div>
    </div>
  );
}

// Root layout — only AuthProvider (lightweight for public routes)
function RootLayout() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}

// Game layout — wraps routes that need game providers
function GameLayout() {
  return (
    <RoomProvider>
      <SupabaseChatProvider>
        <SupabaseGameProvider>
          <GameProvider>
            <Outlet />
          </GameProvider>
        </SupabaseGameProvider>
      </SupabaseChatProvider>
    </RoomProvider>
  );
}

// Protected route wrapper
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes (no game providers needed)
      {
        path: '/',
        element: <LandingPage onSelectChallenge={() => {}} />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: '/about',
        element: <AboutPage />,
      },
      // Protected routes with game providers
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: '/change-password',
            element: <ChangePasswordPage />,
          },
          // Game-related routes get full game provider stack
          {
            element: <GameLayout />,
            children: [
              {
                path: '/lobby',
                element: <LobbyPage />,
              },
              {
                path: '/room/:code',
                element: <WaitingRoom />,
              },
              {
                path: '/game/:code',
                element: <GamePage />,
              },
              {
                path: '/spectate/:code',
                element: <SpectatorView />,
              },
              {
                path: '/results/:code',
                element: <ResultsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
