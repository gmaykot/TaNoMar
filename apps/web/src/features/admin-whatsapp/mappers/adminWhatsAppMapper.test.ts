import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseWhatsAppDestinations, parseWhatsAppIntegration } from './adminWhatsAppMapper';

describe('adminWhatsAppMapper', () => {
  it('mapeia configuração, status e destinos', () => {
    expect(
      parseWhatsAppIntegration({
        enabled: true,
        notifyByEmail: true,
        instanceName: 'TaNoMar',
        defaultDestinationType: 'group',
        defaultDestinationId: '120363000000@g.us',
        defaultDestinationName: 'TaNoMar Admin',
        notifyNewUser: true,
        notifyPlanRequested: true,
        notifyPlanPaid: true,
        notifyPlanChanged: true,
        createdAt: '2026-09-10T12:00:00Z',
        updatedAt: '2026-09-10T12:00:00Z',
        status: {
          state: 'connected',
          phoneNumber: '5511999999999',
          lastConnectedAt: '2026-09-10T12:00:00Z',
          error: null,
        },
      }).status.state,
    ).toBe('connected');

    expect(
      parseWhatsAppDestinations({
        personal: [{ id: '5511999999999@s.whatsapp.net', name: 'Gabriel' }],
        groups: [{ id: '120363000000@g.us', name: 'TaNoMar Admin' }],
      }).groups[0]?.name,
    ).toBe('TaNoMar Admin');
  });

  it('recusa contrato incompleto', () => {
    expect(() => parseWhatsAppIntegration({ enabled: true })).toThrow(ContractError);
  });
});
