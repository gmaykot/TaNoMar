import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { formatBrlFromCents } from '@/features/subscription/subscriptionPlans';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import {
  billingCycleLabel,
  billingPlanLabel,
  canCancelRenewal,
  canResumePendingCheckout,
  cancelRenewalConfirmMessage,
  formatBillingDate,
  type BillingSubscription,
} from '../billing';
import { useBillingCheckout, useCancelBillingSubscription } from '../hooks/useBillingCheckout';
import styles from './subscriptionBilling.module.css';

function formatReais(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return formatBrlFromCents(Math.round(value * 100));
}

export function SubscriptionBillingCard({
  planName,
  billing,
  isPaid = false,
  showPlansLink = false,
}: {
  planName?: string;
  billing?: BillingSubscription;
  isPaid?: boolean;
  showPlansLink?: boolean;
}) {
  const cancel = useCancelBillingSubscription();
  const checkout = useBillingCheckout();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const accessUntil = formatBillingDate(billing?.accessUntil);
  const cycle = billingCycleLabel(billing?.cycle);
  const contracted = formatReais(billing?.contractedPrice);
  const renewal = formatReais(billing?.renewalPrice);
  const canCancel = canCancelRenewal(billing);
  const canResume = canResumePendingCheckout(billing);
  const canceled = billing?.cancelAtPeriodEnd === true && Boolean(accessUntil);
  const priceChanged = Boolean(contracted && renewal && contracted !== renewal);
  const pending = billing?.status === 'pending';
  const pastDue = billing?.status === 'past_due';
  const billingEnabled = billing?.enabled === true;
  const showCard = isPaid || canCancel || canceled || pending || pastDue || priceChanged;
  if (!showCard) return null;

  const planLabel =
    (pending ? billingPlanLabel(billing?.planCode) : null) ?? planName ?? 'plano pago';
  const cycleLabel = cycle ? ` · ${cycle}` : '';
  const cancelError =
    cancel.error instanceof ApiError
      ? cancel.error.message
      : cancel.isError
        ? 'Não foi possível cancelar a renovação.'
        : null;
  const checkoutError =
    checkout.error instanceof ApiError
      ? checkout.error.message
      : checkout.isError
        ? 'Não foi possível abrir o pagamento.'
        : null;

  function handleConfirmCancel() {
    cancel.mutate(undefined, { onSuccess: () => setConfirmCancel(false) });
  }

  function handleResumeCheckout() {
    if (!billing?.planCode || !billing.cycle) return;
    checkout.mutate({ planCode: billing.planCode, cycle: billing.cycle });
  }

  return (
    <Card as="section" className={styles.card} id="assinatura" aria-labelledby="assinatura-title">
      <h2 id="assinatura-title">Sua assinatura</h2>
      {pending ? (
        <p>
          Há um pagamento em aberto do {planLabel}
          {cycleLabel}. Continue no Asaas para concluir.
        </p>
      ) : null}
      {pastDue ? <p>A renovação está atrasada. Atualize o pagamento para manter o plano.</p> : null}
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
      {isPaid && !canCancel && !canceled && !pending && !pastDue ? (
        <p>
          {billingEnabled
            ? `${planLabel} está ativo na conta, mas não há renovação automática para cancelar.`
            : `${planLabel} está ativo na conta. A cobrança automática ainda não está ligada, então não há renovação para cancelar por aqui.`}
        </p>
      ) : null}
      {priceChanged ? (
        <p>
          Neste período você pagou {contracted}. A renovação será {renewal}. A diferença não é
          cobrada agora.
        </p>
      ) : null}
      {cancelError || checkoutError ? (
        <p className={styles.error} role="alert">
          {cancelError ?? checkoutError}
        </p>
      ) : null}
      {canResume ? (
        <Button onClick={handleResumeCheckout} disabled={checkout.isPending}>
          {checkout.isPending ? 'Abrindo o pagamento…' : 'Continuar pagamento'}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          variant="secondary"
          onClick={() => setConfirmCancel(true)}
          disabled={cancel.isPending}
        >
          Cancelar renovação
        </Button>
      ) : null}
      {showPlansLink ? (
        <Link className={styles.plansLink} to={`${routes.premium}#planos`}>
          Ver planos
        </Link>
      ) : null}
      {confirmCancel ? (
        <ConfirmDrawer
          title="Cancelar renovação?"
          description={cancelRenewalConfirmMessage(accessUntil)}
          confirmLabel="Cancelar renovação"
          cancelLabel="Manter plano"
          busy={cancel.isPending}
          onCancel={() => {
            if (!cancel.isPending) setConfirmCancel(false);
          }}
          onConfirm={handleConfirmCancel}
        />
      ) : null}
    </Card>
  );
}
