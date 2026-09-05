import { ContractError } from '@/shared/api/errors';
import type { CommunityReport, ReportType, ReportVote } from '../types/community';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function parseType(value: string): ReportType {
  if (value === 'condicao' || value === 'perigo') return value;
  throw new ContractError(`Tipo de relato desconhecido: ${value}.`);
}

function parseVote(value: unknown): ReportVote | null {
  if (value === null || value === undefined) return null;
  if (value === 'confirm' || value === 'contest') return value;
  throw new ContractError('Voto de relato inválido.');
}

export function parseReport(value: unknown): CommunityReport {
  if (!isRecord(value)) throw new ContractError('Relato inválido.');
  const id = readString(value.id);
  const spotId = readString(value.spotId);
  const spotName = readString(value.spotName);
  const type = readString(value.type);
  const authorName = readString(value.authorName);
  const createdAt = readString(value.createdAt);
  const expiresAt = readString(value.expiresAt);
  const confirmations = readNumber(value.confirmations);
  const contested = readNumber(value.contested);
  const isMine = readBoolean(value.isMine);
  if (!id || !spotId || !spotName || !type || !authorName || !createdAt || !expiresAt) {
    throw new ContractError('Relato incompleto.');
  }
  if (confirmations === null || contested === null) {
    throw new ContractError('Relato sem votos.');
  }
  if (isMine === null) {
    throw new ContractError('Relato incompleto.');
  }
  return {
    id,
    spotId,
    spotName,
    type: parseType(type),
    comment: readString(value.comment),
    authorName,
    createdAt,
    expiresAt,
    confirmations,
    contested,
    myVote: parseVote(value.myVote),
    isMine,
  };
}

export function parseReportList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de relatos inválida.');
  return value.map(parseReport);
}
