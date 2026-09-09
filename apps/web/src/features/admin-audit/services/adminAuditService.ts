import { apiRequest } from '@/shared/api/client';
import { parseAdminAuditResult } from '../mappers/adminAuditMapper';
import type { AdminAuditInput, AdminAuditResult } from '../types/adminAudit';

export async function runAdminAudit(input: AdminAuditInput): Promise<AdminAuditResult> {
  const query = new URLSearchParams({
    spotId: input.spotId,
    date: input.date,
    refreshSources: String(input.refreshSources),
  });
  return parseAdminAuditResult(await apiRequest(`/admin/fishing-audit?${query.toString()}`));
}
