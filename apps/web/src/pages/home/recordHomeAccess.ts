import { apiRequest } from '@/shared/api/client';

export function recordHomeAccess() {
  return apiRequest('/me/access', { method: 'POST' }).catch(() => undefined);
}
