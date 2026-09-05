import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';
import styles from './components.module.css';

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  locked?: boolean;
}

export function MetricTile({ icon: Icon, label, value, detail, locked = false }: MetricTileProps) {
  const DisplayIcon = locked ? Lock : Icon;
  return (
    <div
      className={`${styles.metric} ${locked ? styles.metricLocked : ''}`}
      aria-label={locked ? `${label} bloqueado no plano atual` : undefined}
    >
      <div className={styles.metricIcon} aria-hidden="true">
        <DisplayIcon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}
