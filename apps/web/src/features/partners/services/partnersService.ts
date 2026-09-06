import { apiRequest } from '@/shared/api/client';
import {
  parseAdminPartner,
  parseAdminPartnerList,
  parsePartner,
  parsePartnerList,
} from '../mappers/partnerMapper';
import { parsePlatformSettings } from '../mappers/platformSettingsMapper';
import type { PartnerInput } from '../types/partner';

function toPayload(input: PartnerInput) {
  return {
    name: input.name.trim(),
    category: input.category,
    tagline: input.tagline.trim() || null,
    about: input.about.trim() || null,
    city: input.city.trim() || null,
    whatsApp: input.whatsApp.trim() || null,
    instagram: input.instagram.trim() || null,
    website: input.website.trim() || null,
    mapsUrl: input.mapsUrl.trim() || null,
    coverImageUrl: input.coverImageUrl.trim() || null,
    isPublished: input.isPublished,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    offers: input.offers
      .filter((offer) => offer.title.trim())
      .map((offer, index) => ({
        title: offer.title.trim(),
        description: offer.description?.trim() || null,
        priceLabel: offer.priceLabel?.trim() || null,
        endsAt: offer.endsAt,
        sortOrder: index,
      })),
  };
}

export async function getPartners() {
  return parsePartnerList(await apiRequest('/partners'));
}

export async function getPartner(slug: string) {
  return parsePartner(await apiRequest(`/partners/${encodeURIComponent(slug)}`));
}

export async function getAdminPartners() {
  return parseAdminPartnerList(await apiRequest('/admin/partners'));
}

export async function createAdminPartner(input: PartnerInput) {
  return parseAdminPartner(
    await apiRequest('/admin/partners', {
      method: 'POST',
      body: JSON.stringify(toPayload(input)),
    }),
  );
}

export async function updateAdminPartner(slug: string, input: PartnerInput) {
  return parseAdminPartner(
    await apiRequest(`/admin/partners/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(toPayload(input)),
    }),
  );
}

export async function deleteAdminPartner(slug: string) {
  await apiRequest(`/admin/partners/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

export async function getPlatformSettings() {
  return parsePlatformSettings(await apiRequest('/admin/settings'));
}

export async function setPlatformShowPartners(showPartners: boolean) {
  return parsePlatformSettings(
    await apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ showPartners }),
    }),
  );
}
