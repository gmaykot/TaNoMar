import { useContext } from 'react';
import { AuthSessionContext } from '../session/authSessionContext';

export function useAuth() {
  const session = useContext(AuthSessionContext);
  if (!session) throw new Error('useAuth precisa do AuthSessionProvider.');
  return session;
}
