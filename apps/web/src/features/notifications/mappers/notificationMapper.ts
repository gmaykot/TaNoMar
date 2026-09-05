import { ContractError } from '@/shared/api/errors';
import type { AppNotification, NotificationUnread, PushPublicKey } from '../types/notification';

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

export function parseNotificationUnread(value: unknown): NotificationUnread {
  if (!isRecord(value) || typeof value.unread !== 'boolean') {
    throw new ContractError('Estado de não lidas inválido.');
  }
  return { unread: value.unread };
}

export function parsePushPublicKey(value: unknown): PushPublicKey {
  if (!isRecord(value)) throw new ContractError('Chave de push inválida.');
  const publicKey = readString(value.publicKey);
  if (!publicKey) throw new ContractError('Chave de push incompleta.');
  return { publicKey };
}

export function parseSseUnreadEvents(buffer: string): { unread?: boolean; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  let unread: boolean | undefined;
  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (!line.startsWith('data:')) continue;
      try {
        const payload: unknown = JSON.parse(line.slice(5).trim());
        if (isRecord(payload) && typeof payload.unread === 'boolean') unread = payload.unread;
      } catch {
        throw new ContractError('Evento de notificação inválido.');
      }
    }
  }
  return { unread, rest };
}
