import { apiRequest } from '@/shared/api/client';
import { parsePlanCatalogList } from '../mappers/subscriptionPlanMapper';
import type { PlanCatalog } from '../subscriptionPlans';

export async function getSubscriptionPlans(): Promise<PlanCatalog[]> {
  return parsePlanCatalogList(await apiRequest('/plans?includeFree=true'));
}
