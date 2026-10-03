import pino from 'pino';
import { createApp } from './app.js';
import { BaileysConnection } from './baileys/connection.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const sendTimeoutSeconds = Number(process.env.SEND_TIMEOUT_SECONDS ?? '20');
const internalApiKey = process.env.INTERNAL_API_KEY?.trim() ?? '';
const sessionPath = process.env.SESSION_PATH?.trim() || '/data/session';
const instanceName = process.env.INSTANCE_NAME?.trim() || 'TaNoMar';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

if (!internalApiKey) throw new Error('INTERNAL_API_KEY precisa ser configurada.');
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT inválida.');
if (!Number.isInteger(sendTimeoutSeconds) || sendTimeoutSeconds < 1 || sendTimeoutSeconds > 300)
  throw new Error('SEND_TIMEOUT_SECONDS inválido.');

const connection = new BaileysConnection(sessionPath, instanceName, logger);
const app = createApp(connection, internalApiKey, { sendTimeoutSeconds });
let server: ReturnType<typeof app.listen> | undefined;
let shuttingDown = false;

process.on('unhandledRejection', (error) => {
  logger.error({ error: safeError(error) }, 'WhatsApp unhandled rejection');
  void shutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ error: safeError(error) }, 'WhatsApp uncaught exception');
  void shutdown('uncaughtException');
});
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

server = app.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'tanomar-whatsapp started');
  void connection.start().catch((error: unknown) => logger.warn({ error: safeError(error) }, 'WhatsApp initial connection failed'));
});

async function shutdown(reason: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Stopping tanomar-whatsapp');
  await connection.shutdown();
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
  process.exitCode = 0;
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
