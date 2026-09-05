import { useId } from 'react';
import {
  islandRegions,
  islandWideRegion,
  regionOptions,
  resolveRegion,
  toggleRegions,
  type IslandRegionId,
} from '../regions';
import styles from './regionPicker.module.css';

const hotspotClass: Record<IslandRegionId, string> = {
  norte: styles.hotspotNorte,
  leste: styles.hotspotLeste,
  oeste: styles.hotspotOeste,
  sul: styles.hotspotSul,
};

const zoneClass: Record<IslandRegionId, string> = {
  norte: styles.norte,
  leste: styles.leste,
  oeste: styles.oeste,
  sul: styles.sul,
};

const islandPath =
  'M78 12C95 8 118 22 122 42C126 58 118 72 108 82C128 92 142 112 138 138C134 162 118 178 108 198C98 218 82 232 64 228C48 224 42 208 48 190C54 172 48 158 42 140C36 118 40 98 52 86C42 74 40 56 48 40C56 22 64 16 78 12Z';

interface RegionPickerBase {
  hint?: string;
}

interface SingleRegionPickerProps extends RegionPickerBase {
  multiple?: false;
  value: string;
  onChange: (region: string) => void;
}

interface MultiRegionPickerProps extends RegionPickerBase {
  multiple: true;
  value: string[];
  onChange: (regions: string[]) => void;
}

type RegionPickerProps = SingleRegionPickerProps | MultiRegionPickerProps;

export function RegionPicker(props: RegionPickerProps) {
  const clipId = useId().replace(/:/g, '');
  const selected = props.multiple ? props.value : [resolveRegion(props.value)];
  const options = regionOptions(selected);
  const islandSelected = selected.includes(islandWideRegion);

  function select(next: string) {
    if (props.multiple) {
      props.onChange(toggleRegions(props.value, next));
      return;
    }
    props.onChange(resolveRegion(next));
  }

  return (
    <div className={styles.picker}>
      <span>{props.multiple ? 'Regiões' : 'Região'}</span>
      {props.hint ? <p className={styles.hint}>{props.hint}</p> : null}
      <div className={styles.stage}>
        <div className={styles.map} role="presentation">
          <svg viewBox="0 0 160 240" aria-hidden="true">
            <defs>
              <clipPath id={clipId}>
                <path d={islandPath} />
              </clipPath>
            </defs>
            <rect className={styles.water} x="0" y="0" width="160" height="240" rx="28" />
            <g clipPath={`url(#${clipId})`}>
              {islandRegions.map((region) => {
                const active = islandSelected || selected.includes(region.value);
                return (
                  <path
                    key={region.id}
                    className={`${styles.zone} ${zoneClass[region.id]} ${active ? styles.zoneActive : ''}`}
                    d={zonePath(region.id)}
                  />
                );
              })}
            </g>
            <path className={styles.outline} d={islandPath} />
            {islandRegions.map((region) => (
              <text
                key={`${region.id}-label`}
                className={`${styles.label} ${islandSelected || selected.includes(region.value) ? styles.labelActive : ''}`}
                x={labelPoint(region.id).x}
                y={labelPoint(region.id).y}
              >
                {region.shortLabel}
              </text>
            ))}
          </svg>
          <div className={styles.hotspots}>
            {islandRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                className={`${styles.hotspot} ${hotspotClass[region.id]}`}
                aria-pressed={islandSelected || selected.includes(region.value)}
                aria-label={region.value}
                onClick={() => select(region.value)}
              />
            ))}
          </div>
        </div>
        <div
          className={styles.chips}
          role="group"
          aria-label={props.multiple ? 'Regiões da ilha' : 'Região da ilha'}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.chip} ${selected.includes(option.value) ? styles.chipActive : ''}`}
              aria-pressed={selected.includes(option.value)}
              onClick={() => select(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function zonePath(id: (typeof islandRegions)[number]['id']) {
  if (id === 'norte') return 'M0 0H160V78H0Z';
  if (id === 'leste') return 'M80 70H160V168H80Z';
  if (id === 'oeste') return 'M0 70H80V168H0Z';
  return 'M0 155H160V240H0Z';
}

function labelPoint(id: (typeof islandRegions)[number]['id']) {
  if (id === 'norte') return { x: 86, y: 48 };
  if (id === 'leste') return { x: 118, y: 128 };
  if (id === 'oeste') return { x: 52, y: 128 };
  return { x: 78, y: 204 };
}
