import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { routes } from '@/shared/constants/routes';
import {
  checkoutConfirmationCopy,
  checkoutConfirmationFromBilling,
  isCheckoutConfirmed,
} from '../billing';
import { clearCheckoutIntent, readCheckoutIntent } from '../checkoutIntent';
import { billingCatalogQueryKey } from './useBillingCatalog';

export type CheckoutReturnPhase = 'idle' | 'waiting' | 'confirmed' | 'canceled' | 'expired';

const pollIntervalMs = 2000;
const maxPolls = 15;

export function useCheckoutReturn() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkout = searchParams.get('checkout');
  const [dismissed, setDismissed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const intent = readCheckoutIntent();
  const confirmed = isCheckoutConfirmed(auth.user, intent);

  useEffect(() => {
    if (checkout !== 'success' || dismissed || confirmed) return;

    let cancelled = false;
    let attempts = 0;

    async function refreshSession() {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: billingCatalogQueryKey }),
      ]);
    }

    void refreshSession();
    const timer = window.setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      if (attempts >= maxPolls) {
        setTimedOut(true);
        window.clearInterval(timer);
        return;
      }
      void refreshSession();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [checkout, confirmed, dismissed, queryClient]);

  useEffect(() => {
    if (confirmed) clearCheckoutIntent();
  }, [confirmed]);

  function dismiss() {
    setDismissed(true);
    clearCheckoutIntent();
    navigate({ pathname: routes.premium, hash: 'assinatura' }, { replace: true });
  }

  const confirmation =
    confirmed && auth.user?.billing
      ? checkoutConfirmationCopy(
          checkoutConfirmationFromBilling(auth.user.billing, auth.user.plan.name),
        )
      : null;

  let phase: CheckoutReturnPhase = 'idle';
  if (!dismissed && checkout === 'cancel') phase = 'canceled';
  else if (!dismissed && checkout === 'expired') phase = 'expired';
  else if (!dismissed && checkout === 'success') phase = confirmed ? 'confirmed' : 'waiting';

  return { phase, timedOut, confirmation, dismiss };
}
