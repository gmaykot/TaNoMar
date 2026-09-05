import styles from './components.module.css';

interface SparklineProps {
  values: number[];
  label: string;
  locked?: boolean;
}

const width = 160;
const height = 44;
const padding = 3;

export function Sparkline({ values, label, locked = false }: SparklineProps) {
  const empty = locked || values.length < 2;
  const min = empty ? 0 : Math.min(...values);
  const max = empty ? 1 : Math.max(...values);
  const span = max - min || 1;
  const points = empty
    ? `${padding},${height / 2} ${width - padding},${height / 2}`
    : values
        .map((value, index) => {
          const x = padding + (index / (values.length - 1)) * (width - padding * 2);
          const y = height - padding - ((value - min) / span) * (height - padding * 2);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

  return (
    <svg
      className={`${styles.sparkline} ${locked ? styles.sparklineLocked : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={locked ? `${label} bloqueado no plano atual` : label}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
