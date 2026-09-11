import { apiRequest } from '@/shared/api/client';
import { parseAdminDashboard } from '../mappers/adminDashboardMapper';
import type { AdminDashboardSnapshot } from '../types/adminDashboard';

export async function getAdminDashboard(): Promise<AdminDashboardSnapshot> {
  return parseAdminDashboard(await apiRequest('/admin/dashboard'));
}
