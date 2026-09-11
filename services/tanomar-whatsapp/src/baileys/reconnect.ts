import { DisconnectReason } from '@whiskeysockets/baileys';

const fatalDisconnects = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.forbidden,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.badSession,
]);

export function isFatalDisconnect(statusCode: number | undefined): boolean {
  return statusCode !== undefined && fatalDisconnects.has(statusCode);
}

export function shouldAutoReconnect(statusCode: number | undefined): boolean {
  if (isFatalDisconnect(statusCode)) return false;
  if (statusCode === DisconnectReason.connectionReplaced) return false;
  return true;
}

export function reconnectDelayMs(attempt: number, statusCode: number | undefined): number {
  if (statusCode === DisconnectReason.restartRequired) return 1_000;
  const exponent = Math.max(0, attempt - 1);
  return Math.min(2_000 * 2 ** exponent, 60_000);
}
