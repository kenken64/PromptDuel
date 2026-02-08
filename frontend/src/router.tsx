import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoomProvider } from './contexts/RoomContext';
import { GameProvider } from './contexts/GameContext';
import { SupabaseChatProvider } from './contexts/SupabaseChatContext';
import { SupabaseGameProvider } from './contexts/SupabaseGameContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { AboutPage } from './pages/AboutPage';
import { LobbyPage } from './pages/LobbyPage';
import { WaitingRoom } from './pages/WaitingRoom';
import { GamePage } from './pages/GamePage';
import { SpectatorView } from './pages/SpectatorView';
import { ResultsPage } from './pages/ResultsPage';

// Layout wrapper with providers
function AppLayout() {
  return (
    <AuthProvider>
      <RoomProvider>
        <SupabaseChatProvider>
          <SupabaseGameProvider>
            <GameProvider>
              <Outlet />
            </GameProvider>
          </SupabaseGameProvider>
        </SupabaseChatProvider>
      </RoomProvider>
    </AuthProvider>
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
    element: <AppLayout />,
    children: [
      // Public routes
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
      // Protected routes
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: '/lobby',
            element: <LobbyPage />,
          },
          {
            path: '/change-password',
            element: <ChangePasswordPage />,
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
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
