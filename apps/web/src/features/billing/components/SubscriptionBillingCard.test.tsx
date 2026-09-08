import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { BillingSubscription } from '../billing';
import { SubscriptionBillingCard } from './SubscriptionBillingCard';

const { cancelSubscription } = vi.hoisted(() => ({
  cancelSubscription: vi.fn(),
}));

vi.mock('../services/billingService', () => ({
  cancelBillingSubscription: (...args: unknown[]) => cancelSubscription(...args),
  getBillingCatalog: vi.fn(),
  getBillingSubscription: vi.fn(),
  startBillingCheckout: vi.fn(),
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

describe('SubscriptionBillingCard', () => {
  beforeEach(() => {
    cancelSubscription.mockReset();
  });

  it('cancela a renovação sem estorno e explica a volta ao Free', async () => {
    cancelSubscription.mockResolvedValue({
      ...activeYearly,
      status: 'canceled',
      cancelAtPeriodEnd: true,
      renewsAt: null,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderWithProviders(<SubscriptionBillingCard planName="Mestre" billing={activeYearly} />);

    expect(screen.getByText(/conta passa para Free/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar renovação' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('volta para Free'));
    expect(cancelSubscription).toHaveBeenCalledTimes(1);
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

  it('não renderiza quando a cobrança está desligada', () => {
    renderWithProviders(<SubscriptionBillingCard billing={{ ...activeYearly, enabled: false }} />);
    expect(screen.queryByRole('heading', { name: 'Sua assinatura' })).not.toBeInTheDocument();
  });
});
