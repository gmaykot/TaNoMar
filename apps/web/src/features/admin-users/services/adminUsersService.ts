import { apiRequest } from '@/shared/api/client';
import { parseAdminUser, parseAdminUserList } from '../mappers/adminUserMapper';
import type { AdminPlanCode, AdminUser } from '../types/adminUser';

export async function getAdminUsers(): Promise<AdminUser[]> {
  return parseAdminUserList(await apiRequest('/admin/users'));
}

export async function setAdminUserPlan(id: string, planCode: AdminPlanCode): Promise<AdminUser> {
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

export async function setAdminUserRole(id: string, role: 'Admin' | 'User'): Promise<AdminUser> {
  return parseAdminUser(
    await apiRequest(`/admin/users/${encodeURIComponent(id)}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  );
}
