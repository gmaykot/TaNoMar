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
  async shutdown(): Promise<void> { this.statusValue.state = 'disconnected'; }
  status(): StatusResponse { return this.statusValue; }
  async qrDataUrl(): Promise<string | null> { return 'data:image/png;base64,test'; }
  async listPersonalChats(): Promise<Destination[]> { return [{ id: '5511999999999@s.whatsapp.net', name: 'Gabriel' }]; }
  async listGroups(): Promise<Destination[]> { return [{ id: '120363000000@g.us', name: 'TaNoMar Admin' }]; }
  failSendWith: Error | null = null;
  sendDelayMs = 0;

  async send(destinationId: string, message: string): Promise<string> {
    if (this.failSendWith) throw this.failSendWith;
    if (this.sendDelayMs) await new Promise((resolve) => setTimeout(resolve, this.sendDelayMs));
    this.sent.push({ destinationId, message });
    return 'fake-message-id';
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
    assert.equal((await sent.json() as { messageId: string }).messageId, 'fake-message-id');
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
    const connection = new FakeConnection();
    connection.statusValue.state = 'disconnected';
    const disconnectedServer = createApp(connection, 'secret').listen(0, '127.0.0.1');
    await once(disconnectedServer, 'listening');
    assert.equal((await fetch(`http://127.0.0.1:${(disconnectedServer.address() as AddressInfo).port}/health`)).status, 200);
    disconnectedServer.close();
    const groups = await fetch(`http://127.0.0.1:${port}/groups`, {
      headers: { 'x-internal-api-key': 'secret' },
    });
    assert.equal(groups.status, 200);
    assert.equal((await groups.json() as { items: Destination[] }).items[0]?.name, 'TaNoMar Admin');
  } finally {
    server.close();
  }
});

test('retorna erros de entrada, indisponibilidade e timeout com códigos distintos', async () => {
  const connection = new FakeConnection();
  const server = createApp(connection, 'secret', { sendTimeoutSeconds: 0.01 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const headers = { authorization: 'Bearer secret', 'content-type': 'application/json' };
  try {
    assert.equal((await fetch(`http://127.0.0.1:${port}/send`, { method: 'POST', headers, body: '{' })).status, 400);
    const invalid = await fetch(`http://127.0.0.1:${port}/send`, {
      method: 'POST', headers, body: JSON.stringify({ destinationId: 'not-a-jid', message: '' }),
    });
    assert.equal(invalid.status, 400);

    connection.statusValue.state = 'disconnected';
    connection.failSendWith = new Error('WhatsApp não conectado.');
    const unavailable = await fetch(`http://127.0.0.1:${port}/send`, {
      method: 'POST', headers, body: JSON.stringify({ destinationId: '120363000000@g.us', message: 'Teste' }),
    });
    assert.equal(unavailable.status, 503);

    connection.statusValue.state = 'connected';
    connection.failSendWith = null;
    connection.sendDelayMs = 100;
    const timeout = await fetch(`http://127.0.0.1:${port}/send`, {
      method: 'POST', headers, body: JSON.stringify({ destinationId: '120363000000@g.us', message: 'Teste' }),
    });
    assert.equal(timeout.status, 504);
    assert.equal((await timeout.json() as { code: string }).code, 'send_timeout');
  } finally {
    server.close();
  }
});
