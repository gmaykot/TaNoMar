import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import type { Destination, StatusResponse, WhatsAppConnection } from './types.js';

class FakeConnection implements WhatsAppConnection {
  sent: { destinationId: string; message: string }[] = [];
  statusValue: StatusResponse = {
    state: 'connected',
    phoneNumber: '5511999999999',
    lastConnectedAt: '2026-09-10T12:00:00.000Z',
    error: null,
  };

  async start(): Promise<void> {}
  async reconnect(): Promise<void> {}
  async logout(): Promise<void> { this.statusValue.state = 'disconnected'; }
  status(): StatusResponse { return this.statusValue; }
  async qrDataUrl(): Promise<string | null> { return 'data:image/png;base64,test'; }
  async listPersonalChats(): Promise<Destination[]> { return [{ id: '5511999999999@s.whatsapp.net', name: 'Gabriel' }]; }
  async listGroups(): Promise<Destination[]> { return [{ id: '120363000000@g.us', name: 'TaNoMar Admin' }]; }
  failSendWith: Error | null = null;

  async send(destinationId: string, message: string): Promise<void> {
    if (this.failSendWith) throw this.failSendWith;
    this.sent.push({ destinationId, message });
  }
}

test('protege endpoints internos e envia mensagem válida', async () => {
  const connection = new FakeConnection();
  const server = createApp(connection, 'secret').listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  try {
    const unauthorized = await fetch(`http://127.0.0.1:${port}/status`);
    assert.equal(unauthorized.status, 401);

    const sent = await fetch(`http://127.0.0.1:${port}/send`, {
      method: 'POST',
      headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
      body: JSON.stringify({ destinationId: '120363000000@g.us', message: 'Teste' }),
    });
    assert.equal(sent.status, 200);
    assert.deepEqual(connection.sent, [{ destinationId: '120363000000@g.us', message: 'Teste' }]);

    connection.failSendWith = new Error('Não é possível enviar para o próprio número conectado. Use outro WhatsApp ou um grupo.');
    const ownNumber = await fetch(`http://127.0.0.1:${port}/send`, {
      method: 'POST',
      headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
      body: JSON.stringify({ destinationId: '5511999999999@s.whatsapp.net', message: 'Teste' }),
    });
    assert.equal(ownNumber.status, 400);
  } finally {
    server.close();
  }
});

test('mantém health público e lista destinos autenticados', async () => {
  const server = createApp(new FakeConnection(), 'secret').listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  try {
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status, 200);
    const groups = await fetch(`http://127.0.0.1:${port}/groups`, {
      headers: { 'x-internal-api-key': 'secret' },
    });
    assert.equal(groups.status, 200);
    assert.equal((await groups.json() as { items: Destination[] }).items[0]?.name, 'TaNoMar Admin');
  } finally {
    server.close();
  }
});
