import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { apiGet } from '../lib/api';
import type { AuthUser } from '../types/api';

export const currentUserQueryKey = ['auth', 'me'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthUser }>('/auth/me');
      return response.user;
    },
    retry(failureCount, error) {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }

      return failureCount < 2;
    }
  });
}

