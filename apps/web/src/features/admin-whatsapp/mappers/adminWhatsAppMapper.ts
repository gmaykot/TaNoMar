import { ContractError } from '@/shared/api/errors';
import type {
  WhatsAppConnectionState,
  WhatsAppDestination,
  WhatsAppDestinations,
  WhatsAppDestinationType,
  WhatsAppIntegration,
} from '../types/adminWhatsApp';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nullableString(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === 'string' ? value : undefined;
}

function connectionState(value: unknown): WhatsAppConnectionState | null {
  return value === 'connected' ||
    value === 'connecting' ||
    value === 'disconnected' ||
    value === 'error'
    ? value
    : null;
}

function destinationType(value: unknown): WhatsAppDestinationType | null | undefined {
  return value === null ? null : value === 'personal' || value === 'group' ? value : undefined;
}

export function parseWhatsAppIntegration(value: unknown): WhatsAppIntegration {
  if (!isRecord(value) || !isRecord(value.status))
    throw new ContractError('Configuração do WhatsApp inválida.');
  const state = connectionState(value.status.state);
  const type = destinationType(value.defaultDestinationType);
  const destinationId = nullableString(value.defaultDestinationId);
  const destinationName = nullableString(value.defaultDestinationName);
  const phoneNumber = nullableString(value.status.phoneNumber);
  const lastConnectedAt = nullableString(value.status.lastConnectedAt);
  const error = nullableString(value.status.error);
  if (
    typeof value.enabled !== 'boolean' ||
    typeof value.notifyByEmail !== 'boolean' ||
    typeof value.instanceName !== 'string' ||
    !state ||
    type === undefined ||
    destinationId === undefined ||
    destinationName === undefined ||
    typeof value.notifyNewUser !== 'boolean' ||
    typeof value.notifyPlanRequested !== 'boolean' ||
    typeof value.notifyPlanChanged !== 'boolean' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    phoneNumber === undefined ||
    lastConnectedAt === undefined ||
    error === undefined
  ) {
    throw new ContractError('Configuração do WhatsApp incompleta.');
  }
  return {
    enabled: value.enabled,
    notifyByEmail: value.notifyByEmail,
    instanceName: value.instanceName,
    defaultDestinationType: type,
    defaultDestinationId: destinationId,
    defaultDestinationName: destinationName,
    notifyNewUser: value.notifyNewUser,
    notifyPlanRequested: value.notifyPlanRequested,
    notifyPlanChanged: value.notifyPlanChanged,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    status: { state, phoneNumber, lastConnectedAt, error },
  };
}

export function parseWhatsAppDestinations(value: unknown): WhatsAppDestinations {
  if (!isRecord(value) || !Array.isArray(value.personal) || !Array.isArray(value.groups))
    throw new ContractError('Destinos do WhatsApp inválidos.');
  return {
    personal: value.personal.map(parseDestination),
    groups: value.groups.map(parseDestination),
  };
}

export function parseQrCode(value: unknown): string {
  if (
    !isRecord(value) ||
    typeof value.dataUrl !== 'string' ||
    !value.dataUrl.startsWith('data:image/')
  )
    throw new ContractError('QR Code do WhatsApp inválido.');
  return value.dataUrl;
}

export function parseOperationDetail(value: unknown): string {
  if (!isRecord(value) || typeof value.detail !== 'string')
    throw new ContractError('Resposta da integração inválida.');
  return value.detail;
}

function parseDestination(value: unknown): WhatsAppDestination {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string')
    throw new ContractError('Destino do WhatsApp inválido.');
  return { id: value.id, name: value.name };
}
