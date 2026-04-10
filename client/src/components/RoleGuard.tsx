import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../types/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from './LoadingState';

export function RoleGuard({ allowedRoles, children }: { allowedRoles: Role[]; children: ReactNode }) {
  const currentUserQuery = useCurrentUser();

  if (currentUserQuery.isPending) {
    return <LoadingState message="Checking role permissions..." />;
  }

  if (!currentUserQuery.data || !allowedRoles.includes(currentUserQuery.data.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

