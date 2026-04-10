import type { Role } from '@prisma/client';

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
}
