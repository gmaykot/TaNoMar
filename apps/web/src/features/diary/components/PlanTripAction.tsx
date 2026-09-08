import { CalendarPlus, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPlanModule } from '@/features/auth/types/auth';
import { findTripPlan, saveTripPlan } from '@/features/diary/diaryStorage';
import { SubscriptionGateDrawer } from '@/features/subscription/components/SubscriptionGateDrawer';
import { routes } from '@/shared/constants/routes';
import { formatCalendarDate } from '@/shared/utils/formatDateTime';
import styles from './planTrip.module.css';

interface PlanTripActionProps {
  spotId: string;
  spotName: string;
  date: string;
  time: string;
}

function tripWhen(date: string, time: string) {
  const formatted = formatCalendarDate(date);
  return time ? `${formatted} · ${time}` : formatted;
}

export function PlanTripAction({ spotId, spotName, date, time }: PlanTripActionProps) {
  const auth = useAuth();
  const canDiary = hasPlanModule(auth.user, 'diary');
  const [confirming, setConfirming] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const planned = canDiary ? findTripPlan(spotId, date) : null;
  const when = tripWhen(date, planned?.time || time);

  function confirmPlan() {
    saveTripPlan({
      spotId,
      spotName,
      date,
      time,
      notes: planned?.notes ?? '',
    });
    setConfirming(false);
    showSaveConfirmation('Saída planejada.');
  }

  return (
    <>
      <div className={styles.action}>
        <Button
          type="button"
          variant="secondary"
          locked={!canDiary}
          aria-label={!canDiary ? 'Planejar saída. Disponível na assinatura.' : undefined}
          onClick={() => {
            if (!canDiary) {
              setUpgradeOpen(true);
              return;
            }
            setConfirming(true);
          }}
        >
          {!canDiary ? (
            <Lock size={16} aria-hidden="true" />
          ) : (
            <CalendarPlus size={16} aria-hidden="true" />
          )}
          Planejar saída
        </Button>
        {planned ? (
          <>
            <span role="status" className={styles.status}>
              Saída em {when}. Guardada neste aparelho.
            </span>
            <Link className={styles.diaryLink} to={routes.diary}>
              Ver no diário
            </Link>
          </>
        ) : null}
      </div>
      {upgradeOpen ? (
        <SubscriptionGateDrawer action="Planejar saída" onCancel={() => setUpgradeOpen(false)} />
      ) : null}
      {confirming ? (
        <ConfirmDrawer
          title="Planejar esta saída?"
          description={
            planned
              ? `Já existe um planejamento para ${spotName} em ${formatCalendarDate(date)}. Confirmar substitui pela janela ${time || 'do dia selecionado'}.`
              : `${spotName} em ${formatCalendarDate(date)}${time ? `, na melhor janela ${time}` : ''}. Fica guardada neste aparelho, no Diário.`
          }
          confirmLabel="Planejar saída"
          onCancel={() => setConfirming(false)}
          onConfirm={confirmPlan}
        />
      ) : null}
    </>
  );
}
