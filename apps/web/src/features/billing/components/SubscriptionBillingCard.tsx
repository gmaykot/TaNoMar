import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { formatBrlFromCents } from '@/features/subscription/subscriptionPlans';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import {
  billingCycleLabel,
  canCancelRenewal,
  cancelRenewalConfirmMessage,
  formatBillingDate,
  type BillingSubscription,
} from '../billing';
import { useCancelBillingSubscription } from '../hooks/useBillingCheckout';
import styles from './subscriptionBilling.module.css';

function formatReais(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return formatBrlFromCents(Math.round(value * 100));
}

export function SubscriptionBillingCard({
  planName,
  billing,
  showPlansLink = false,
}: {
  planName?: string;
  billing?: BillingSubscription;
  showPlansLink?: boolean;
}) {
  const cancel = useCancelBillingSubscription();
  if (!billing?.enabled) return null;

  const accessUntil = formatBillingDate(billing.accessUntil);
  const cycle = billingCycleLabel(billing.cycle);
  const contracted = formatReais(billing.contractedPrice);
  const renewal = formatReais(billing.renewalPrice);
  const canCancel = canCancelRenewal(billing);
  const canceled = billing.cancelAtPeriodEnd && Boolean(accessUntil);
  const priceChanged = Boolean(contracted && renewal && contracted !== renewal);
  const showCard =
    canCancel ||
    canceled ||
    billing.status === 'pending' ||
    billing.status === 'past_due' ||
    priceChanged;
  if (!showCard) return null;

  const planLabel = planName ?? 'plano pago';
  const cycleLabel = cycle ? ` · ${cycle}` : '';
  const cancelError =
    cancel.error instanceof ApiError
      ? cancel.error.message
      : cancel.isError
        ? 'Não foi possível cancelar a renovação.'
        : null;

  function handleCancel() {
    if (!window.confirm(cancelRenewalConfirmMessage(accessUntil))) return;
    cancel.mutate();
  }

  return (
    <Card as="section" className={styles.card} id="assinatura" aria-labelledby="assinatura-title">
      <h2 id="assinatura-title">Sua assinatura</h2>
      {billing.status === 'pending' ? (
        <p>Há um pagamento em aberto. Conclua ou gere outro checkout na página de Assinatura.</p>
      ) : null}
      {billing.status === 'past_due' ? (
        <p>A renovação está atrasada. Atualize o pagamento para manter o plano.</p>
      ) : null}
      {canceled ? (
        <p>
          Renovação cancelada · {planLabel} até {accessUntil}. Depois disso, a conta volta para
          Free. Não há estorno.
        </p>
      ) : null}
      {canCancel && accessUntil ? (
        <p>
          {planLabel}
          {cycleLabel}. Você usa o plano até {accessUntil}. Se cancelar a renovação, o valor já pago
          não volta e, no fim do período, a conta passa para Free.
        </p>
      ) : null}
      {priceChanged ? (
        <p>
          Neste período você pagou {contracted}. A renovação será {renewal}. A diferença não é
          cobrada agora.
        </p>
      ) : null}
      {cancelError ? (
        <p className={styles.error} role="alert">
          {cancelError}
        </p>
      ) : null}
      {canCancel ? (
        <Button variant="secondary" onClick={handleCancel} disabled={cancel.isPending}>
          {cancel.isPending ? 'Cancelando…' : 'Cancelar renovação'}
        </Button>
      ) : null}
      {showPlansLink ? (
        <Link className={styles.plansLink} to={`${routes.premium}#planos`}>
          Ver planos
        </Link>
      ) : null}
    </Card>
  );
}
