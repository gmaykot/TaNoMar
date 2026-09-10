import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { AdminWorker } from '@/features/admin-workers/types/adminWorker';
import { AdminWorkersPage } from './AdminWorkersPage';

const scheduledWorker: AdminWorker = {
  key: 'forecast-alerts',
  name: 'Alertas de previsão',
  kind: 'scheduled',
  enabled: true,
  cronExpression: '0 * * * *',
  timeZone: 'America/Sao_Paulo',
  description: 'Verifica os alertas ativos.',
  usedBy: 'Caixa de notificações.',
  dataSource: 'Alertas e previsões no PostgreSQL.',
};

const queueWorker: AdminWorker = {
  key: 'web-push-dispatch',
  name: 'Envio Web Push',
  kind: 'queue',
  enabled: true,
  cronExpression: null,
  timeZone: 'America/Sao_Paulo',
  description: 'Entrega notificações aos aparelhos.',
  usedBy: 'Avisos do aplicativo.',
  dataSource: 'Fila interna e inscrições Push.',
};

const { updateAdminWorker } = vi.hoisted(() => ({
  updateAdminWorker: vi.fn(),
}));

vi.mock('@/features/admin-workers/services/adminWorkersService', () => ({
  getAdminWorkers: () => Promise.resolve([scheduledWorker, queueWorker]),
  updateAdminWorker,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminWorkersPage', () => {
  beforeEach(() => {
    updateAdminWorker.mockReset();
    updateAdminWorker.mockResolvedValue(scheduledWorker);
  });

  it('lista workers, exibe informações e salva habilitação e CRON', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminWorkersPage />);

    const scheduled = await screen.findByRole('article', { name: 'Alertas de previsão' });
    expect(screen.getByRole('article', { name: 'Envio Web Push' })).toHaveTextContent(
      'não usa CRON',
    );

    await user.click(
      within(scheduled).getByRole('button', { name: 'Informações sobre Alertas de previsão' }),
    );
    expect(within(scheduled).getByText('O que é')).toBeInTheDocument();
    expect(within(scheduled).getByText('Onde é usado')).toBeInTheDocument();
    expect(within(scheduled).getByText('De onde busca')).toBeInTheDocument();

    await user.click(within(scheduled).getByRole('checkbox', { name: /Worker habilitado/ }));
    const cron = within(scheduled).getByLabelText(/Periodicidade/);
    await user.clear(cron);
    await user.type(cron, '0 */2 * * *');
    await user.click(within(scheduled).getByRole('button', { name: 'Salvar worker' }));

    expect(updateAdminWorker).toHaveBeenCalledWith('forecast-alerts', {
      isEnabled: false,
      cronExpression: '0 */2 * * *',
    });
  });
});
