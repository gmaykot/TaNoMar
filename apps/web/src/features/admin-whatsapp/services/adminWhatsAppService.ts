import { apiRequest } from '@/shared/api/client';
import {
  parseOperationDetail,
  parseQrCode,
  parseWhatsAppDestinations,
  parseWhatsAppIntegration,
} from '../mappers/adminWhatsAppMapper';
import type { WhatsAppSettingsUpdate } from '../types/adminWhatsApp';

const basePath = '/admin/integrations/whatsapp';

export async function getWhatsAppIntegration() {
  return parseWhatsAppIntegration(await apiRequest(basePath));
}

export async function updateWhatsAppIntegration(input: WhatsAppSettingsUpdate) {
  return parseWhatsAppIntegration(
    await apiRequest(basePath, { method: 'PUT', body: JSON.stringify(input) }),
  );
}

export async function getWhatsAppDestinations() {
  return parseWhatsAppDestinations(await apiRequest(`${basePath}/destinations`));
}

export async function getWhatsAppQrCode() {
  return parseQrCode(await apiRequest(`${basePath}/qr`));
}

export async function runWhatsAppAction(action: 'connect' | 'reconnect' | 'disconnect' | 'test') {
  return parseOperationDetail(await apiRequest(`${basePath}/${action}`, { method: 'POST' }));
}
