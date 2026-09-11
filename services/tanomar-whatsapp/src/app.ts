import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { WhatsAppConnection } from './types.js';

export function createApp(connection: WhatsAppConnection, internalApiKey: string) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));

  app.use((request, response, next) => {
    const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '')
      ?? request.headers['x-internal-api-key']?.toString()
      ?? '';
    if (!tokensMatch(supplied, internalApiKey))
      return response.status(401).json({ code: 'unauthorized', detail: 'Credencial interna inválida.' });
    next();
  });

  app.get('/status', (_request, response) => response.json(connection.status()));
  app.get('/qr', async (_request, response) => {
    const dataUrl = await connection.qrDataUrl();
    response.json({ dataUrl });
  });
  app.get('/chats', async (_request, response) =>
    response.json({ items: await connection.listPersonalChats() }));
  app.get('/groups', async (_request, response) =>
    response.json({ items: await connection.listGroups() }));
  app.post('/connect', async (request, response) => {
    await connection.start(readInstanceName(request));
    response.status(202).json({ detail: 'Conexão iniciada.' });
  });
  app.post('/reconnect', async (request, response) => {
    await connection.reconnect(readInstanceName(request));
    response.status(202).json({ detail: 'Reconexão iniciada.' });
  });
  app.post('/logout', async (_request, response) => {
    await connection.logout();
    response.json({ detail: 'WhatsApp desconectado.' });
  });
  app.post('/send', async (request, response) => {
    const destinationId = typeof request.body?.destinationId === 'string' ? request.body.destinationId.trim() : '';
    const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
    if (!isDestination(destinationId) || !message)
      return response.status(400).json({ code: 'invalid_message', detail: 'Destino e mensagem são obrigatórios.' });
    try {
      await connection.send(destinationId, message);
    } catch (error) {
      if (error instanceof Error && /próprio número|não foi encontrado/.test(error.message))
        return response.status(400).json({ code: 'invalid_destination', detail: error.message });
      throw error;
    }
    response.json({ detail: 'Mensagem enviada.' });
  });

  app.use((_error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    response.status(503).json({
      code: 'whatsapp_unavailable',
      detail: 'Serviço WhatsApp indisponível.',
    });
  });

  return app;
}

function tokensMatch(supplied: string, expected: string): boolean {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length
    && suppliedBuffer.length > 0
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function readInstanceName(request: Request): string | undefined {
  return typeof request.body?.instanceName === 'string' ? request.body.instanceName.trim() : undefined;
}

function isDestination(value: string): boolean {
  return value.endsWith('@s.whatsapp.net') || value.endsWith('@g.us') || value.endsWith('@lid');
}
