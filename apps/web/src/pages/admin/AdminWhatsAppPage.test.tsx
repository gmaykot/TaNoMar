import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminWhatsAppPage } from './AdminWhatsAppPage';

const { updateWhatsAppIntegration, runWhatsAppAction } = vi.hoisted(() => ({
  updateWhatsAppIntegration: vi.fn(),
  runWhatsAppAction: vi.fn(),
}));

const integration = {
  enabled: true,
  notifyByEmail: true,
  instanceName: 'TaNoMar',
  defaultDestinationType: 'group' as const,
  defaultDestinationId: '120363000000@g.us',
  defaultDestinationName: 'TaNoMar Admin',
  notifyNewUser: true,
  notifyPlanRequested: true,
  notifyPlanPaid: true,
  notifyPlanChanged: true,
  notifyRenewalCanceled: true,
  createdAt: '2026-09-10T12:00:00Z',
  updatedAt: '2026-09-10T12:00:00Z',
  status: {
    state: 'connected' as const,
    phoneNumber: '5511999999999',
    lastConnectedAt: '2026-09-10T12:00:00Z',
    error: null,
  },
};

vi.mock('@/features/admin-whatsapp/services/adminWhatsAppService', () => ({
  getWhatsAppIntegration: () => Promise.resolve(integration),
  getWhatsAppDestinations: () =>
    Promise.resolve({
      personal: [{ id: '5511999999999@s.whatsapp.net', name: 'Gabriel' }],
      groups: [{ id: '120363000000@g.us', name: 'TaNoMar Admin' }],
    }),
  getWhatsAppQrCode: () => Promise.resolve('data:image/png;base64,test'),
  updateWhatsAppIntegration,
  runWhatsAppAction,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation: vi.fn() }));

describe('AdminWhatsAppPage', () => {
  beforeEach(() => {
    updateWhatsAppIntegration.mockReset();
    updateWhatsAppIntegration.mockResolvedValue(integration);
    runWhatsAppAction.mockReset();
    runWhatsAppAction.mockResolvedValue('Mensagem de teste enviada com sucesso.');
  });

  it('mostra status, salva destino e testa o envio', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminWhatsAppPage />);

    const status = await screen.findByRole('region', { name: 'Status da integração' });
    expect(within(status).getByText('Conectado')).toBeInTheDocument();
    expect(within(status).getByText('5511999999999')).toBeInTheDocument();
    expect(within(status).getByText('Destino configurado')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'TaNoMar Admin' })).toBeInTheDocument();
    expect(screen.getByText('Pagamento de plano confirmado')).toBeInTheDocument();
    expect(screen.getByText('Plano de usuário alterado')).toBeInTheDocument();
    expect(screen.getByText('Renovação cancelada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    expect(updateWhatsAppIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultDestinationType: 'group',
        defaultDestinationId: '120363000000@g.us',
        defaultDestinationName: 'TaNoMar Admin',
        enabled: true,
        notifyByEmail: true,
        notifyPlanPaid: true,
        notifyPlanChanged: true,
        notifyRenewalCanceled: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem de teste' }));
    expect(runWhatsAppAction.mock.calls[0]?.[0]).toBe('test');
    expect(await screen.findByRole('status')).toHaveTextContent('Mensagem de teste enviada');
  });

  it('permite escolher somente e-mail como canal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminWhatsAppPage />);

    await user.selectOptions(
      await screen.findByLabelText('Canais das notificações administrativas'),
      'email',
    );
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(updateWhatsAppIntegration).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, notifyByEmail: true }),
    );
  });

  it('salva um número pessoal informado na UI', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminWhatsAppPage />);

    await user.click(await screen.findByRole('radio', { name: 'Conversa pessoal' }));
    await user.type(screen.getByLabelText('Número ou JID do WhatsApp'), '48999999999');
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(updateWhatsAppIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultDestinationType: 'personal',
        defaultDestinationId: '5548999999999@s.whatsapp.net',
        defaultDestinationName: '5548999999999',
      }),
    );
  });
});
