import { createContext } from 'react';
import type { AuthStatus, AuthUser } from '../types/auth';

export interface AuthSessionValue {
  status: AuthStatus;
  user: AuthUser | null;
  userLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthSessionContext = createContext<AuthSessionValue | null>(null);
