import type { AuthenticatedRequestUser, AuthenticatedSession } from './auth';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthenticatedRequestUser;
      session?: AuthenticatedSession;
    }
  }
}

export {};
