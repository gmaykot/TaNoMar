import { apiRequest } from '@/shared/api/client';
import { parseAdminUser, parseAdminUserList } from '../mappers/adminUserMapper';
import type { AdminUser } from '../types/adminUser';

export async function getAdminUsers(): Promise<AdminUser[]> {
  return parseAdminUserList(await apiRequest('/admin/users'));
}

export async function setAdminUserPlan(
  id: string,
  planCode: 'free' | 'premium',
): Promise<AdminUser> {
  return parseAdminUser(
    await apiRequest(`/admin/users/${encodeURIComponent(id)}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ planCode }),
    }),
  );
}

export async function setAdminUserActive(id: string, isActive: boolean): Promise<AdminUser> {
  return parseAdminUser(
    await apiRequest(`/admin/users/${encodeURIComponent(id)}/active`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    }),
  );
}
