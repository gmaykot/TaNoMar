import pino from 'pino';
import { createApp } from './app.js';
import { BaileysConnection } from './baileys/connection.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const internalApiKey = process.env.INTERNAL_API_KEY?.trim() ?? '';
const sessionPath = process.env.SESSION_PATH?.trim() || '/data/session';
const instanceName = process.env.INSTANCE_NAME?.trim() || 'TaNoMar';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

if (!internalApiKey) throw new Error('INTERNAL_API_KEY precisa ser configurada.');
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT inválida.');

const connection = new BaileysConnection(sessionPath, instanceName, logger);
const app = createApp(connection, internalApiKey);

process.on('unhandledRejection', (error) => {
  logger.warn({ error }, 'WhatsApp unhandled rejection');
});
process.on('uncaughtException', (error) => {
  logger.warn({ error }, 'WhatsApp uncaught exception');
});

app.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'tanomar-whatsapp started');
  void connection.start().catch((error: unknown) => logger.warn({ error }, 'WhatsApp initial connection failed'));
});
