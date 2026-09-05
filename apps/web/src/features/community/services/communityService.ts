import { apiRequest } from '@/shared/api/client';
import { parseReport, parseReportList } from '../mappers/reportMapper';
import type { CommunityReport, ReportType } from '../types/community';

export async function getReports(spotId?: string): Promise<CommunityReport[]> {
  const query = spotId ? `?spotId=${encodeURIComponent(spotId)}` : '';
  return parseReportList(await apiRequest(`/community/reports${query}`));
}

export async function createReport(
  spotId: string,
  type: ReportType,
  comment?: string,
): Promise<CommunityReport> {
  return parseReport(
    await apiRequest('/community/reports', {
      method: 'POST',
      body: JSON.stringify({ spotId, type, comment }),
    }),
  );
}

export async function confirmReport(id: string) {
  await apiRequest(`/community/reports/${encodeURIComponent(id)}/confirm`, { method: 'POST' });
}

export async function contestReport(id: string) {
  await apiRequest(`/community/reports/${encodeURIComponent(id)}/contest`, { method: 'POST' });
}

export async function deleteReport(id: string) {
  await apiRequest(`/community/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
