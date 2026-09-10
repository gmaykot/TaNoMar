import { apiRequest } from '@/shared/api/client';
import { parseAdminWorker, parseAdminWorkerList } from '../mappers/adminWorkerMapper';
import type { AdminWorker, AdminWorkerUpdate } from '../types/adminWorker';

export async function getAdminWorkers(): Promise<AdminWorker[]> {
  return parseAdminWorkerList(await apiRequest('/admin/workers'));
}

export async function updateAdminWorker(
  key: string,
  input: AdminWorkerUpdate,
): Promise<AdminWorker> {
  return parseAdminWorker(
    await apiRequest(`/admin/workers/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
}
