import { ContractError } from '@/shared/api/errors';
import type { AdminWorker, AdminWorkerKind } from '../types/adminWorker';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readKind(value: unknown): AdminWorkerKind | null {
  return value === 'scheduled' || value === 'queue' ? value : null;
}

export function parseAdminWorker(value: unknown): AdminWorker {
  if (!isRecord(value)) throw new ContractError('Worker inválido.');
  const key = readString(value.key);
  const name = readString(value.name);
  const kind = readKind(value.kind);
  const enabled = typeof value.enabled === 'boolean' ? value.enabled : null;
  const cronExpression = value.cronExpression === null ? null : readString(value.cronExpression);
  const hasValidCron = value.cronExpression === null || cronExpression !== null;
  const timeZone = readString(value.timeZone);
  const description = readString(value.description);
  const usedBy = readString(value.usedBy);
  const dataSource = readString(value.dataSource);
  if (
    !key ||
    !name ||
    !kind ||
    enabled === null ||
    !hasValidCron ||
    !timeZone ||
    !description ||
    !usedBy ||
    !dataSource
  ) {
    throw new ContractError('Worker incompleto.');
  }
  return { key, name, kind, enabled, cronExpression, timeZone, description, usedBy, dataSource };
}

export function parseAdminWorkerList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de workers inválida.');
  return value.map(parseAdminWorker);
}
