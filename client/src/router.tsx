import { createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { RoleGuard } from './components/RoleGuard';
import { AppLayout } from './layouts/AppLayout';
import { AdminPage } from './pages/AdminPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { GamesPage } from './pages/GamesPage';
import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { ManageGamesPage } from './pages/ManageGamesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderPage } from './pages/OrderPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReviewPage } from './pages/ReviewPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'games',
        element: <GamesPage />
      },
      {
        path: 'orders',
        element: <OrderPage />
      },
      {
        path: 'reviews',
        element: <ReviewPage />
      },
      {
        path: 'account/password',
        element: <ChangePasswordPage />
      },
      {
        path: 'manage/games',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
            <ManageGamesPage />
          </RoleGuard>
        )
      },
      {
        path: 'admin',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            <AdminPage />
          </RoleGuard>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
], {
  basename: import.meta.env.BASE_URL
});
