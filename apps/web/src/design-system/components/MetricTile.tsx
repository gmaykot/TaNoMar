import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';
import styles from './components.module.css';

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  secondary?: string[];
  rows?: Array<{ label: string; value: string }>;
  locked?: boolean;
  compact?: boolean;
  tone?: 'dark' | 'light';
}

export function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  secondary,
  rows,
  locked = false,
  compact = false,
  tone = 'dark',
}: MetricTileProps) {
  const DisplayIcon = locked ? Lock : Icon;
  const secondaryLines = secondary ?? (detail ? [detail] : []);

  if (compact)
    return (
      <div
        className={`${styles.metric} ${styles.metricCompact} ${tone === 'light' ? styles.metricLight : ''} ${locked ? styles.metricLocked : ''}`}
        aria-label={locked ? `${label} bloqueado no plano atual` : undefined}
      >
        <div className={styles.metricCompactHeader}>
          <DisplayIcon size={19} aria-hidden="true" />
          <span>{label}</span>
        </div>
        {rows ? (
          <div className={styles.metricCompactRows}>
            {rows.map((row) => (
              <div key={row.label}>
                <span>{row.label}:</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <>
            <strong className={styles.metricCompactValue}>{value}</strong>
            {secondaryLines.map((line) => (
              <small className={styles.metricCompactSecondary} key={line}>
                {line}
              </small>
            ))}
          </>
        )}
      </div>
    );

  return (
    <div
      className={`${styles.metric} ${tone === 'light' ? styles.metricLight : ''} ${locked ? styles.metricLocked : ''}`}
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
