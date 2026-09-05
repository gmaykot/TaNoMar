import { apiBaseUrl } from '@/shared/api/env';
import { apiRequest, refreshAccessTokenOnce } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { getAccessToken } from '@/shared/api/session';
import {
  parseNotificationList,
  parseNotificationUnread,
  parsePushPublicKey,
  parseSseUnreadEvents,
} from '../mappers/notificationMapper';
import type { AppNotification, NotificationUnread } from '../types/notification';

export async function getNotifications(): Promise<AppNotification[]> {
  return parseNotificationList(await apiRequest('/notifications'));
}

export async function getUnreadNotifications(): Promise<NotificationUnread> {
  return parseNotificationUnread(await apiRequest('/notifications/unread'));
}

export async function markNotificationRead(id: string) {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

export async function removeNotification(id: string) {
  await apiRequest(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getPushPublicKey() {
  try {
    return parsePushPublicKey(await apiRequest('/notifications/push-public-key'));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  await apiRequest('/notifications/push-subscription', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deletePushSubscription(endpoint: string) {
  await apiRequest('/notifications/push-subscription', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}

export async function subscribeNotificationStream(
  onUnread: (unread: boolean) => void,
  signal: AbortSignal,
) {
  const url = `${apiBaseUrl}/notifications/stream`;
  let response = await openStream(url, signal);
  if (response.status === 401) {
    const token = await refreshAccessTokenOnce();
    if (!token) throw new ApiError(401, 'Sessão expirada.');
    response = await openStream(url, signal);
  }
  if (!response.ok || !response.body) {
    throw new ApiError(response.status, `A API respondeu ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseUnreadEvents(buffer);
    buffer = parsed.rest;
    if (typeof parsed.unread === 'boolean') onUnread(parsed.unread);
  }
}

async function openStream(url: string, signal: AbortSignal) {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { headers, credentials: 'include', signal });
}
