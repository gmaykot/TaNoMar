import { useQuery } from '@tanstack/react-query';
import {
  getWhatsAppDestinations,
  getWhatsAppIntegration,
  getWhatsAppQrCode,
} from '../services/adminWhatsAppService';

export const adminWhatsAppQueryKey = ['admin-whatsapp'] as const;

export function useWhatsAppIntegration() {
  return useQuery({
    queryKey: adminWhatsAppQueryKey,
    queryFn: getWhatsAppIntegration,
    refetchInterval: (query) => (query.state.data?.status.state === 'connecting' ? 3_000 : false),
  });
}

export function useWhatsAppDestinations(enabled: boolean) {
  return useQuery({
    queryKey: [...adminWhatsAppQueryKey, 'destinations'],
    queryFn: getWhatsAppDestinations,
    enabled,
  });
}

export function useWhatsAppQrCode(enabled: boolean) {
  return useQuery({
    queryKey: [...adminWhatsAppQueryKey, 'qr'],
    queryFn: getWhatsAppQrCode,
    enabled,
    retry: false,
    refetchInterval: enabled ? 3_000 : false,
  });
}
