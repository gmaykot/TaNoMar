import { ContractError } from '@/shared/api/errors';
import {
  partnerCategories,
  type AdminPartner,
  type Partner,
  type PartnerCategory,
  type PartnerOffer,
} from '../types/partner';

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

function parseCategory(value: string): PartnerCategory {
  if ((partnerCategories as readonly string[]).includes(value)) return value as PartnerCategory;
  throw new ContractError(`Categoria de parceiro desconhecida: ${value}.`);
}

function parseOffer(value: unknown): PartnerOffer {
  if (!isRecord(value)) throw new ContractError('Oferta inválida.');
  const title = readString(value.title)?.trim();
  if (!title) throw new ContractError('Oferta sem título.');
  return {
    title,
    description: readString(value.description),
    priceLabel: readString(value.priceLabel),
    endsAt: readString(value.endsAt),
  };
}

function parseOffers(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ContractError('Lista de ofertas inválida.');
  return value.map(parseOffer);
}

function parsePartnerBase(value: unknown): Partner {
  if (!isRecord(value)) throw new ContractError('Parceiro inválido.');
  const id = readString(value.id);
  const slug = readString(value.slug) ?? id;
  const name = readString(value.name);
  const category = readString(value.category);
  const city = readString(value.city);
  const isFeatured = readBoolean(value.isFeatured);
  if (!id || !slug || !name || !category || city === null || isFeatured === null) {
    throw new ContractError('Parceiro incompleto.');
  }
  return {
    id,
    slug,
    name,
    category: parseCategory(category),
    tagline: readString(value.tagline),
    about: readString(value.about),
    city,
    whatsApp: readString(value.whatsApp),
    instagram: readString(value.instagram),
    website: readString(value.website),
    mapsUrl: readString(value.mapsUrl),
    coverImageUrl: readString(value.coverImageUrl),
    isFeatured,
    offers: parseOffers(value.offers),
  };
}

export function parsePartner(value: unknown): Partner {
  return parsePartnerBase(value);
}

export function parsePartnerList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de parceiros inválida.');
  return value.map(parsePartner);
}

export function parseAdminPartner(value: unknown): AdminPartner {
  if (!isRecord(value)) throw new ContractError('Parceiro inválido.');
  const partner = parsePartnerBase(value);
  const isPublished = readBoolean(value.isPublished);
  const sortOrder = readNumber(value.sortOrder);
  const createdAt = readString(value.createdAt);
  const updatedAt = readString(value.updatedAt);
  if (isPublished === null || sortOrder === null || !createdAt || !updatedAt) {
    throw new ContractError('Parceiro admin incompleto.');
  }
  return { ...partner, isPublished, sortOrder, createdAt, updatedAt };
}

export function parseAdminPartnerList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de parceiros inválida.');
  return value.map(parseAdminPartner);
}
