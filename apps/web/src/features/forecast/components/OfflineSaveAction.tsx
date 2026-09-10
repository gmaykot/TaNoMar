import { Download } from 'lucide-react';
import { useState } from 'react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import type { FishingForecast } from '@/features/fishing/types/fishing';
import { saveOfflineForecast } from '@/features/forecast/utils/offlineForecast';
import styles from './OfflineSaveAction.module.css';

interface OfflineSaveActionProps {
  forecast: FishingForecast;
  savedForecast: FishingForecast | null;
  usingSavedCopy?: boolean;
  onSaved: (forecast: FishingForecast) => void;
}

export function OfflineSaveAction({
  forecast,
  savedForecast,
  usingSavedCopy = false,
  onSaved,
}: OfflineSaveActionProps) {
  const [confirming, setConfirming] = useState(false);
  const alreadySaved = Boolean(savedForecast);

  function confirmSave() {
    if (!saveOfflineForecast(forecast)) {
      setConfirming(false);
      return;
    }

    onSaved(forecast);
    setConfirming(false);
    showSaveConfirmation('Previsão salva neste aparelho.');
  }

  return (
    <div className={styles.root}>
      <Button
        type="button"
        variant="secondary"
        className={styles.button}
        onClick={() => setConfirming(true)}
      >
        <span>
          <Download size={22} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span>
          <strong>
            {alreadySaved ? 'Previsão salva neste aparelho' : 'Salvar para usar offline'}
          </strong>
          <small>
            {alreadySaved
              ? 'Disponível sem internet neste aparelho'
              : 'Leve a previsão para usar sem internet'}
          </small>
        </span>
      </Button>
      {usingSavedCopy ? (
        <small>
          Exibindo a última previsão salva neste aparelho. Ela pode estar desatualizada.
        </small>
      ) : null}
      {confirming ? (
        <ConfirmDrawer
          title="Salvar para usar offline?"
          description={
            alreadySaved
              ? 'Já existe uma previsão neste aparelho. Confirmar substitui a cópia anterior pela previsão atual.'
              : 'A previsão atual fica disponível sem internet neste aparelho. Ela é particular e não substitui a consulta online.'
          }
          confirmLabel={alreadySaved ? 'Atualizar cópia' : 'Salvar offline'}
          onCancel={() => setConfirming(false)}
          onConfirm={confirmSave}
        />
      ) : null}
    </div>
  );
}
