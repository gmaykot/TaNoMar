import { useId, useState } from 'react';
import { formatHourLabel } from '@/features/fishing/utils/hours';
import {
  formatForecastValue,
  timeInMinutes,
  type ForecastChartPoint,
} from '../utils/forecastSeries';
import styles from './forecast.module.css';

interface ForecastChartProps {
  points: ForecastChartPoint[];
  label: string;
  unit: string;
  selectedHour?: string | null;
  tone?: 'wind' | 'waves' | 'rain' | 'temperature' | 'tide';
  annotations?: Array<{ time: string; value: number; label: string }>;
}

const width = 360;
const height = 220;
const padding = { top: 22, right: 14, bottom: 42, left: 48 };

export function ForecastChart({
  points,
  label,
  unit,
  selectedHour,
  tone = 'wind',
  annotations = [],
}: ForecastChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const ordered = [...points]
    .filter((point) => Number.isFinite(point.value) && timeInMinutes(point.time) !== null)
    .sort((left, right) => left.time.localeCompare(right.time));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (ordered.length < 2) return null;

  const values = ordered.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueSpan = maxValue - minValue || Math.max(Math.abs(maxValue) * 0.1, 1);
  const yMin = minValue - valueSpan * 0.12;
  const yMax = maxValue + valueSpan * 0.12;
  const firstMinute = timeInMinutes(ordered[0]!.time)!;
  const lastMinute = timeInMinutes(ordered[ordered.length - 1]!.time)!;
  const timeSpan = lastMinute - firstMinute || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (time: string) => {
    const minute = timeInMinutes(time) ?? firstMinute;
    return padding.left + ((minute - firstMinute) / timeSpan) * plotWidth;
  };
  const yFor = (value: number) => padding.top + ((yMax - value) / (yMax - yMin || 1)) * plotHeight;
  const line = ordered.map((point) => `${xFor(point.time)},${yFor(point.value)}`).join(' ');
  const xTicks = selectTicks(ordered, 4);
  const yTicks = [maxValue, (maxValue + minValue) / 2, minValue];
  const selectedMinute = selectedHour ? timeInMinutes(selectedHour) : null;
  const selectionX =
    selectedMinute !== null && selectedMinute >= firstMinute && selectedMinute <= lastMinute
      ? padding.left + ((selectedMinute - firstMinute) / timeSpan) * plotWidth
      : null;
  const activePoint = activeIndex === null ? null : ordered[activeIndex];
  const activeX = activePoint ? xFor(activePoint.time) : 0;
  const activeY = activePoint ? yFor(activePoint.value) : 0;
  const tooltipX = Math.min(width - 118, Math.max(padding.left, activeX - 48));

  return (
    <div className={`${styles.chart} ${styles[`chart-${tone}`]}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setActiveIndex(null);
        }}
      >
        <title id={titleId}>{label}</title>
        <desc id={descriptionId}>
          {ordered
            .map(
              (point) =>
                `${formatHourLabel(point.time)}: ${formatForecastValue(point.value)} ${unit}`,
            )
            .join('; ')}
        </desc>
        {yTicks.map((tick, index) => {
          const y = yFor(tick);
          return (
            <g key={`${tick}-${index}`}>
              <line
                className={styles.chartGrid}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <text
                className={styles.chartAxisLabel}
                x={padding.left - 7}
                y={y + 4}
                textAnchor="end"
              >
                {formatForecastValue(tick)}
              </text>
            </g>
          );
        })}
        <text className={styles.chartUnit} x={padding.left} y={13}>
          {unit}
        </text>
        {xTicks.map((point) => (
          <text
            className={styles.chartAxisLabel}
            key={point.time}
            x={xFor(point.time)}
            y={height - 14}
            textAnchor="middle"
          >
            {formatHourLabel(point.time)}
          </text>
        ))}
        {selectionX !== null ? (
          <g aria-hidden="true">
            <line
              className={styles.chartSelection}
              x1={selectionX}
              x2={selectionX}
              y1={padding.top}
              y2={height - padding.bottom}
            />
            <text
              className={styles.chartSelectionLabel}
              x={selectionX}
              y={height - padding.bottom + 14}
              textAnchor="middle"
            >
              seleção
            </text>
          </g>
        ) : null}
        <polyline className={styles.chartLine} fill="none" points={line} />
        {annotations.flatMap((annotation, index) => {
          const minute = timeInMinutes(annotation.time);
          if (minute === null || minute < firstMinute || minute > lastMinute) return [];
          const x = xFor(annotation.time);
          const y = yFor(annotation.value);
          const anchor = x < 92 ? 'start' : x > width - 92 ? 'end' : 'middle';
          const labelY = index % 2 === 0 ? Math.max(18, y - 11) : Math.min(height - 49, y + 20);
          return [
            <g
              className={styles.chartAnnotation}
              key={`${annotation.time}-${annotation.label}`}
              aria-hidden="true"
            >
              <circle cx={x} cy={y} r="5" />
              <text x={x} y={labelY} textAnchor={anchor}>
                {annotation.label}
              </text>
            </g>,
          ];
        })}
        {ordered.map((point, index) => (
          <circle
            className={styles.chartPoint}
            key={`${point.time}-${point.value}`}
            cx={xFor(point.time)}
            cy={yFor(point.value)}
            r="4"
            tabIndex={0}
            role="button"
            aria-label={`${formatHourLabel(point.time)}, ${formatForecastValue(point.value)} ${unit}`}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            onPointerEnter={() => setActiveIndex(index)}
            onPointerDown={() => setActiveIndex(index)}
          />
        ))}
        {activePoint ? (
          <g className={styles.chartTooltip} pointerEvents="none" aria-hidden="true">
            <rect x={tooltipX} y={Math.max(4, activeY - 46)} width="104" height="34" rx="8" />
            <text x={tooltipX + 52} y={Math.max(25, activeY - 24)} textAnchor="middle">
              {formatHourLabel(activePoint.time)} · {formatForecastValue(activePoint.value)} {unit}
            </text>
          </g>
        ) : null}
      </svg>
      <p className={styles.chartRange}>
        Mín. {formatForecastValue(minValue)} {unit} · Máx. {formatForecastValue(maxValue)} {unit}
      </p>
    </div>
  );
}

function selectTicks(points: ForecastChartPoint[], limit: number) {
  if (points.length <= limit) return points;
  const indexes = new Set([0, points.length - 1]);
  for (let index = 1; index < limit - 1; index += 1) {
    indexes.add(Math.round((index * (points.length - 1)) / (limit - 1)));
  }
  return [...indexes].sort((left, right) => left - right).map((index) => points[index]!);
}
