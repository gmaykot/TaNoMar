import { parseAuthUser } from '@/features/auth/services/authService';
import { hasPlanModule, type AuthUser } from '@/features/auth/types/auth';
import { readOfflineForecast } from '@/features/forecast/utils/offlineForecast';

const storageKey = 'tanomar.offline-session.v1';

export function saveOfflineUser(user: AuthUser) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
}

export function readOfflineUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return parseAuthUser(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function clearOfflineUser() {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* armazenamento indisponível */
  }
}

export function canRestoreOfflineSession() {
  const user = readOfflineUser();
  return Boolean(user && hasPlanModule(user, 'offline') && readOfflineForecast());
}
