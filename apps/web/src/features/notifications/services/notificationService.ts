import { apiRequest } from '@/shared/api/client';
import { parseNotificationList } from '../mappers/notificationMapper';
import type { AppNotification } from '../types/notification';

export async function getNotifications(): Promise<AppNotification[]> {
  return parseNotificationList(await apiRequest('/notifications'));
}

export async function markNotificationRead(id: string) {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

export async function removeNotification(id: string) {
  await apiRequest(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
