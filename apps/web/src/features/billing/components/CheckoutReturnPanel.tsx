import { Check, PartyPopper, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/design-system/components/Button';
import { useCheckoutReturn } from '../hooks/useCheckoutReturn';
import styles from './checkoutReturn.module.css';

export function CheckoutReturnPanel() {
  const { phase, timedOut, confirmation, dismiss } = useCheckoutReturn();

  if (phase === 'idle') return null;

  if (phase === 'canceled') {
    return (
      <p className={styles.banner} role="status">
        O pagamento foi cancelado. Você pode escolher o plano de novo.
      </p>
    );
  }

  if (phase === 'expired') {
    return (
      <p className={styles.banner} role="status">
        O checkout expirou. Gere um novo pagamento.
      </p>
    );
  }

  if (phase === 'waiting') {
    return (
      <p className={styles.banner} role="status" aria-live="polite" aria-busy="true">
        <Sparkles size={18} aria-hidden="true" />
        <span>
          Recebemos o retorno do pagamento. Estamos confirmando a cobrança
          {timedOut
            ? '. Ainda não vimos a confirmação. Se o valor saiu no cartão, o plano entra em instantes — atualize a página.'
            : '…'}
        </span>
      </p>
    );
  }

  if (!confirmation) return null;

  return (
    <CheckoutCelebration
      title={confirmation.title}
      paid={confirmation.paid}
      next={confirmation.next}
      onDismiss={dismiss}
    />
  );
}

function CheckoutCelebration({
  title,
  paid,
  next,
  onDismiss,
}: {
  title: string;
  paid: string;
  next: string | null;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismissRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return createPortal(
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onDismiss}
        aria-label="Fechar confirmação de pagamento"
      />
      <div
        ref={panelRef}
        className={styles.celebration}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className={styles.burst} aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className={styles.spark} />
          ))}
        </div>
        <span className={styles.badge}>
          <Check size={28} aria-hidden="true" />
        </span>
        <span className={styles.eyebrow}>
          <PartyPopper size={16} aria-hidden="true" /> Pagamento confirmado
        </span>
        <h2 id={titleId}>{title}</h2>
        <div id={descriptionId} className={styles.details}>
          <p>{paid}</p>
          {next ? <p>{next}</p> : null}
        </div>
        <Button type="button" onClick={onDismiss}>
          Ver minha assinatura
        </Button>
      </div>
    </div>,
    document.body,
  );
}
