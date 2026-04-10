import type { Prisma } from '@prisma/client';
import type { AuthenticatedRequestUser } from '../types/auth';

// RBAC scope builders: enforce data isolation at the query level.
// This is the primary authorization boundary — frontend role checks are UI convenience only.
// OWASP A01: Broken Access Control — scopes prevent horizontal privilege escalation.

// ADMIN and MANAGER see all orders; USER sees only their own
export function buildOrderScope(user: AuthenticatedRequestUser): Prisma.OrderWhereInput {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return {};
  }
  return { userId: user.id };
}

// ADMIN and MANAGER see all reviews; USER sees only their own
export function buildReviewScope(user: AuthenticatedRequestUser): Prisma.ReviewWhereInput {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return {};
  }
  return { userId: user.id };
}

// ADMIN sees all users; any other role sees only themselves
export function buildUserScope(user: AuthenticatedRequestUser): Prisma.UserWhereInput {
  if (user.role === 'ADMIN') {
    return {};
  }
  return { id: user.id };
}
