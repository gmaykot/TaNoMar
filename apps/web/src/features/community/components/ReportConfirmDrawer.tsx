import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/design-system/components/Button';
import styles from './reportConfirmDrawer.module.css';

interface ReportConfirmDrawerProps {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReportConfirmDrawer({
  title,
  description,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ReportConfirmDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancelRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return createPortal(
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={() => {
          if (!busy) onCancel();
        }}
        aria-label="Fechar confirmação"
      />
      <div
        ref={panelRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className={styles.handle} aria-hidden="true" />
        <span className={styles.meta}>Confirmação</span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className={styles.actions}>
          <Button type="button" variant="quiet" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
