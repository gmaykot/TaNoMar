import { apiRequest } from '@/shared/api/client';
import {
  parsePlanCatalog,
  parsePlanCatalogList,
} from '@/features/subscription/mappers/subscriptionPlanMapper';
import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';
import type { AdminPlanUpdate } from '../types/adminPlan';

export async function getAdminPlans(): Promise<PlanCatalog[]> {
  return parsePlanCatalogList(await apiRequest('/admin/plans'));
}

export async function updateAdminPlan(code: string, input: AdminPlanUpdate): Promise<PlanCatalog> {
  return parsePlanCatalog(
    await apiRequest(`/admin/plans/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
}
