import { Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { SubscriptionGateDrawer } from '@/features/subscription/components/SubscriptionGateDrawer';
import styles from './spotForm.module.css';

const directions = [
  [0, 'Norte (N)'],
  [45, 'Nordeste (NE)'],
  [90, 'Leste (L)'],
  [135, 'Sudeste (SE)'],
  [180, 'Sul (S)'],
  [225, 'Sudoeste (SO)'],
  [270, 'Oeste (O)'],
  [315, 'Noroeste (NO)'],
] as const;

export function IdealWindPreference({
  initialDirection,
  canConfigure,
  pending,
  error,
  onSave,
}: {
  initialDirection?: number | null;
  canConfigure: boolean;
  pending: boolean;
  error: string | null;
  onSave: (direction: number | null) => void;
}) {
  const [value, setValue] = useState(
    initialDirection === null || initialDirection === undefined ? '' : String(initialDirection),
  );
  const [gateOpen, setGateOpen] = useState(false);

  return (
    <Card as="section" className={styles.card} aria-labelledby="ideal-wind-title">
      <h2 id="ideal-wind-title">Vento ideal</h2>
      <p>Escolha a direção de onde o vento deve vir para personalizar a nota deste local.</p>
      {canConfigure ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            onSave(value === '' ? null : Number(value));
          }}
        >
          <label className={styles.field}>
            <span>Direção ideal</span>
            <select value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Padrão do local</option>
              {directions.map(([degrees, label]) => (
                <option key={degrees} value={degrees}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.actions}>
            <Button type="submit" disabled={pending}>
              Salvar vento ideal
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          locked
          aria-label="Configurar vento ideal. Disponível na assinatura."
          onClick={() => setGateOpen(true)}
        >
          <Lock size={16} aria-hidden="true" /> Configurar vento ideal
        </Button>
      )}
      {gateOpen ? (
        <SubscriptionGateDrawer
          action="Configurar o vento ideal"
          onCancel={() => setGateOpen(false)}
        />
      ) : null}
    </Card>
  );
}
