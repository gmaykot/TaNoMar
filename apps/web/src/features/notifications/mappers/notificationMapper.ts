import { ContractError } from '@/shared/api/errors';
import type { AppNotification } from '../types/notification';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export function parseNotification(value: unknown): AppNotification {
  if (!isRecord(value)) throw new ContractError('Notificação inválida.');
  const id = readString(value.id);
  const title = readString(value.title);
  const body = readString(value.body);
  const createdAt = readString(value.createdAt);
  if (!id || !title || !body || !createdAt) throw new ContractError('Notificação incompleta.');
  return {
    id,
    title,
    body,
    createdAt,
    readAt: readString(value.readAt),
  };
}

export function parseNotificationList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de notificações inválida.');
  return value.map(parseNotification);
}
