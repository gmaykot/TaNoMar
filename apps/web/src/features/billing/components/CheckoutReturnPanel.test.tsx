import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { saveCheckoutIntent } from '../checkoutIntent';
import type { BillingSubscription } from '../billing';
import { CheckoutReturnPanel } from './CheckoutReturnPanel';

const activeYearly: BillingSubscription = {
  status: 'active',
  planCode: 'premium',
  cycle: 'YEARLY',
  catalogMonthlyPrice: 19.9,
  catalogAnnualPrice: 191.04,
  contractedPrice: 191.04,
  renewalPrice: 191.04,
  discountPercent: 20,
  renewsAt: '2027-09-08T12:00:00.000Z',
  accessUntil: '2027-09-08T12:00:00.000Z',
  cancelAtPeriodEnd: false,
  enabled: true,
};

const { authState } = vi.hoisted(() => ({
  authState: {
    user: {
      plan: { code: 'free', name: 'Free' },
      billing: undefined as BillingSubscription | undefined,
    },
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

describe('CheckoutReturnPanel', () => {
  beforeEach(() => {
    sessionStorage.clear();
    authState.user = { plan: { code: 'free', name: 'Free' }, billing: undefined };
  });

  it('espera a confirmação sem promover o plano localmente', async () => {
    renderWithProviders(<CheckoutReturnPanel />, ['/premium?checkout=success']);

    expect(
      await screen.findByText(/Recebemos o retorno do pagamento. Estamos confirmando a cobrança/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Seu plano agora é/ })).not.toBeInTheDocument();
  });

  it('explode a confirmação quando o plano já entrou', async () => {
    authState.user = {
      plan: { code: 'premium', name: 'Mestre' },
      billing: activeYearly,
    };
    saveCheckoutIntent({ planCode: 'premium', cycle: 'YEARLY' });
    const user = userEvent.setup();
    renderWithProviders(<CheckoutReturnPanel />, ['/premium?checkout=success']);

    const dialog = await screen.findByRole('dialog', { name: 'Seu plano agora é Mestre.' });
    expect(dialog).toHaveTextContent('Você pagou R$ 191,04 no ciclo anual.');
    expect(dialog).toHaveTextContent('A próxima cobrança, em 08/09/2027, será R$ 191,04.');

    await user.click(screen.getByRole('button', { name: 'Ver minha assinatura' }));
    expect(screen.queryByRole('dialog', { name: 'Seu plano agora é Mestre.' })).not.toBeInTheDocument();
  });

  it('explica que a primeira cobrança foi a diferença e a próxima é integral', async () => {
    authState.user = {
      plan: { code: 'premium', name: 'Mestre' },
      billing: {
        ...activeYearly,
        contractedPrice: 87.19,
        renewalPrice: 191.04,
      },
    };
    saveCheckoutIntent({ planCode: 'premium', cycle: 'YEARLY' });
    renderWithProviders(<CheckoutReturnPanel />, ['/premium?checkout=success']);

    const dialog = await screen.findByRole('dialog', { name: 'Seu plano agora é Mestre.' });
    expect(dialog).toHaveTextContent('só a diferença desta troca');
    expect(dialog).toHaveTextContent('valor integral do Mestre anual: R$ 191,04');
    expect(dialog).toHaveTextContent('Não é a diferença de novo');
  });

  it('mantém o aviso de cancelamento e expiração', async () => {
    const canceled = renderWithProviders(<CheckoutReturnPanel />, ['/premium?checkout=cancel']);
    expect(screen.getByText(/O pagamento foi cancelado/)).toBeInTheDocument();
    canceled.unmount();

    renderWithProviders(<CheckoutReturnPanel />, ['/premium?checkout=expired']);
    expect(screen.getByText(/O checkout expirou/)).toBeInTheDocument();
  });
});
