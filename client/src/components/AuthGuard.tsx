import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from './LoadingState';

export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const currentUserQuery = useCurrentUser();

  if (currentUserQuery.isPending) {
    return <LoadingState message="Verifying active session..." />;
  }

  if (currentUserQuery.error instanceof ApiError && currentUserQuery.error.status === 401) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (currentUserQuery.error) {
    return <LoadingState message="Unable to load session state. Please refresh the page." />;
  }

  return <>{children}</>;
}

