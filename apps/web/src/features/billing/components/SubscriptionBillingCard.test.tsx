import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { BillingSubscription } from '../billing';
import { SubscriptionBillingCard } from './SubscriptionBillingCard';

const { cancelSubscription, startCheckout } = vi.hoisted(() => ({
  cancelSubscription: vi.fn(),
  startCheckout: vi.fn(),
}));

vi.mock('../services/billingService', () => ({
  cancelBillingSubscription: (...args: unknown[]) => cancelSubscription(...args),
  getBillingCatalog: vi.fn(),
  getBillingSubscription: vi.fn(),
  startBillingCheckout: (...args: unknown[]) => startCheckout(...args),
}));

const activeYearly: BillingSubscription = {
  status: 'active',
  planCode: 'premium',
  cycle: 'YEARLY',
  catalogMonthlyPrice: 19.9,
  catalogAnnualPrice: 191.04,
  contractedPrice: 191.04,
  renewalPrice: 191.04,
  discountPercent: 20,
  renewsAt: '2027-09-08T00:00:00.000Z',
  accessUntil: '2027-09-08T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  enabled: true,
};

const pendingYearly: BillingSubscription = {
  ...activeYearly,
  status: 'pending',
  renewsAt: null,
  accessUntil: null,
};

describe('SubscriptionBillingCard', () => {
  beforeEach(() => {
    cancelSubscription.mockReset();
    startCheckout.mockReset();
  });

  it('cancela a renovação sem estorno e explica a volta ao Free', async () => {
    cancelSubscription.mockResolvedValue({
      ...activeYearly,
      status: 'canceled',
      cancelAtPeriodEnd: true,
      renewsAt: null,
    });
    const user = userEvent.setup();
    renderWithProviders(<SubscriptionBillingCard planName="Mestre" billing={activeYearly} />);

    expect(screen.getByText(/conta passa para Free/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar renovação' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar renovação?' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/permanece vigente até/)).toBeInTheDocument();
    expect(within(dialog).getByText(/não é estornado/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar renovação' }));
    expect(cancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('mantém o plano se a confirmação for fechada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscriptionBillingCard planName="Mestre" billing={activeYearly} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar renovação' }));
    await user.click(screen.getByRole('button', { name: 'Manter plano' }));
    expect(screen.queryByRole('dialog', { name: 'Cancelar renovação?' })).not.toBeInTheDocument();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it('mostra o estado já cancelado até o fim do período', () => {
    renderWithProviders(
      <SubscriptionBillingCard
        planName="Mestre"
        billing={{ ...activeYearly, status: 'canceled', cancelAtPeriodEnd: true, renewsAt: null }}
      />,
    );

    expect(screen.getByText(/Renovação cancelada · Mestre/)).toBeInTheDocument();
    expect(screen.getByText(/volta para Free/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar renovação' })).not.toBeInTheDocument();
  });

  it('não renderiza quando a cobrança está desligada e a conta é Free', () => {
    renderWithProviders(<SubscriptionBillingCard billing={{ ...activeYearly, enabled: false }} />);
    expect(screen.queryByRole('heading', { name: 'Sua assinatura' })).not.toBeInTheDocument();
  });

  it('reabre o checkout pendente no Asaas', async () => {
    startCheckout.mockResolvedValue({
      checkoutId: 'chk_1',
      checkoutUrl: 'https://asaas.com/checkoutSession/show?id=chk_1',
      expiresAt: '2026-09-10T23:00:00Z',
    });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const user = userEvent.setup();
    renderWithProviders(<SubscriptionBillingCard billing={pendingYearly} />);

    expect(screen.getByText(/pagamento em aberto do Mestre · anual/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar pagamento' }));
    expect(startCheckout).toHaveBeenCalledWith('premium', 'YEARLY');
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://asaas.com/checkoutSession/show?id=chk_1'),
    );
  });

  it('explica a ausência de renovação quando o plano pago não tem cobrança', () => {
    renderWithProviders(
      <SubscriptionBillingCard
        planName="Capitão"
        isPaid
        billing={{ ...activeYearly, status: 'inactive', enabled: false }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Sua assinatura' })).toBeInTheDocument();
    expect(screen.getByText(/não há renovação para cancelar por aqui/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar renovação' })).not.toBeInTheDocument();
  });
});
