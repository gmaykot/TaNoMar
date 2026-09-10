import { ListFilter } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { IconButton } from '@/design-system/components/IconButton';
import type { FishingMetricKey } from '@/features/fishing/types/fishing';
import { extraRegions, islandRegions } from '@/features/locations/regions';
import { coastalProfiles, spotTypes } from '@/features/locations/spotCatalog';
import {
  emptyRankingSpotFilters,
  rankingSpotFilterCount,
  toggleRankingFilterValue,
  type RankingSpotFilters,
} from '../rankingSpotFilters';
import type { RankingEmphasis } from '../rankingEmphasis';
import { RankingEmphasisFilters } from './RankingEmphasisFilters';
import styles from './ranking.module.css';

const regions = [...islandRegions, ...extraRegions];

interface RankingFiltersProps {
  emphasis: RankingEmphasis;
  premium: boolean;
  visibleMetricKeys?: FishingMetricKey[];
  onEmphasisChange: (next: RankingEmphasis) => void;
  filters: RankingSpotFilters;
  onFiltersChange: (next: RankingSpotFilters) => void;
}

export function RankingFilters({
  emphasis,
  premium,
  visibleMetricKeys,
  onEmphasisChange,
  filters,
  onFiltersChange,
}: RankingFiltersProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = rankingSpotFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  function toggle(key: keyof RankingSpotFilters, value: string) {
    onFiltersChange({
      ...filters,
      [key]: toggleRankingFilterValue(filters[key], value),
    });
  }

  return (
    <div ref={rootRef} className={styles.toolbar}>
      <div className={styles.filterBar}>
        <RankingEmphasisFilters
          emphasis={emphasis}
          premium={premium}
          visibleMetricKeys={visibleMetricKeys}
          onChange={onEmphasisChange}
        />
        <span className={styles.filterToggleWrap}>
          <IconButton
            label={advancedFilterLabel(open, count)}
            aria-expanded={open}
            aria-controls="ranking-advanced-filters"
            className={open || count > 0 ? styles.filterToggleActive : ''}
            onClick={() => setOpen((current) => !current)}
          >
            <ListFilter size={18} aria-hidden="true" />
          </IconButton>
          {count > 0 ? (
            <span className={styles.filterCount} aria-hidden="true">
              {count}
            </span>
          ) : null}
        </span>
      </div>
      <div className={styles.advanced} id="ranking-advanced-filters" hidden={!open}>
        <fieldset className={styles.advancedGroup}>
          <legend>Tipo</legend>
          <div className={styles.advancedOptions}>
            {spotTypes.map((item) => (
              <FilterChip
                key={item.value}
                label={item.label}
                pressed={filters.types.includes(item.value)}
                onClick={() => toggle('types', item.value)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.advancedGroup}>
          <legend>Região</legend>
          <div className={styles.advancedOptions}>
            {regions.map((region) => (
              <FilterChip
                key={region.value}
                label={region.shortLabel}
                pressed={filters.regions.includes(region.value)}
                onClick={() => toggle('regions', region.value)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.advancedGroup}>
          <legend>Exposição</legend>
          <div className={styles.advancedOptions}>
            {coastalProfiles.map((item) => (
              <FilterChip
                key={item.value}
                label={item.label}
                pressed={filters.profiles.includes(item.value)}
                onClick={() => toggle('profiles', item.value)}
              />
            ))}
          </div>
        </fieldset>
        {count > 0 ? (
          <div className={styles.advancedFooter}>
            <Button
              type="button"
              variant="quiet"
              onClick={() => onFiltersChange(emptyRankingSpotFilters)}
            >
              Limpar filtros
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.filter} ${pressed ? styles.filterActive : ''}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function advancedFilterLabel(open: boolean, count: number) {
  const applied =
    count === 0 ? '' : count === 1 ? ', 1 filtro aplicado' : `, ${count} filtros aplicados`;
  return open ? `Fechar filtros avançados${applied}` : `Filtros avançados${applied}`;
}
