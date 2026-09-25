import { ContractError } from '@/shared/api/errors';
import type { AdminProtection, AdminUser } from '../types/adminUser';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function readCount(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function parseProtection(value: unknown): AdminProtection | null {
  if (value === null || value === undefined) return null;
  if (value === 'self' || value === 'bootstrap' || value === 'last_admin') return value;
  throw new ContractError('Proteção de usuário inválida.');
}

export function parseAdminUser(value: unknown): AdminUser {
  if (!isRecord(value)) throw new ContractError('Usuário admin inválido.');
  const plan = isRecord(value.plan) ? value.plan : null;
  const id = readString(value.id);
  const name = readString(value.name);
  const email = readString(value.email);
  const role = readString(value.role);
  const isActive = readBoolean(value.isActive);
  const planCode = plan ? readString(plan.code) : null;
  const planName = plan ? readString(plan.name) : null;
  const createdAt = readString(value.createdAt);
  const accessCount = readCount(value.accessCount);
  const lastAccessAt = value.lastAccessAt === null ? null : readString(value.lastAccessAt);
  const isSelf = readBoolean(value.isSelf);
  const canChangePlan = readBoolean(value.canChangePlan);
  const canDeactivate = readBoolean(value.canDeactivate);
  const canDelete = readBoolean(value.canDelete);
  const canChangeRole = readBoolean(value.canChangeRole);
  if (
    !id ||
    !name ||
    !email ||
    !role ||
    isActive === null ||
    !planCode ||
    !planName ||
    !createdAt ||
    accessCount === null ||
    lastAccessAt === undefined ||
    isSelf === null ||
    canChangePlan === null ||
    canDeactivate === null ||
    canDelete === null ||
    canChangeRole === null
  ) {
    throw new ContractError('Usuário admin incompleto.');
  }

  return {
    id,
    name,
    email,
    pictureUrl: readString(value.pictureUrl),
    role,
    isActive,
    plan: { code: planCode, name: planName },
    createdAt,
    accessCount,
    lastAccessAt,
    isSelf,
    protection: parseProtection(value.protection),
    canChangePlan,
    canDeactivate,
    canDelete,
    canChangeRole,
  };
}

export function parseAdminUserList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de usuários inválida.');
  return value.map(parseAdminUser);
}
