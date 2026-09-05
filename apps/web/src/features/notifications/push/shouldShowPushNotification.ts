export function shouldShowPushNotification(clients: Array<{ visibilityState?: string }>) {
  return !clients.some((client) => client.visibilityState === 'visible');
}

export function parsePushPayload(value: unknown): { title: string; body: string } {
  if (typeof value !== 'object' || value === null) {
    return { title: 'TáNoMar', body: 'Você tem um novo aviso.' };
  }
  const record = value as Record<string, unknown>;
  const title =
    typeof record.title === 'string' && record.title.length > 0 ? record.title : 'TáNoMar';
  const body = typeof record.body === 'string' ? record.body : 'Você tem um novo aviso.';
  return { title, body };
}
