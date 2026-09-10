import { ChevronDown, ListFilter } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/design-system/components/Button';
import { IconButton } from '@/design-system/components/IconButton';
import { SearchField } from '@/design-system/components/SearchField';
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
const descriptionDebounceMs = 300;

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
  const [descriptionDraft, setDescriptionDraft] = useState(filters.description);
  const rootRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);
  const count = rankingSpotFilterCount({ ...filters, description: descriptionDraft });
  filtersRef.current = filters;
  onFiltersChangeRef.current = onFiltersChange;

  useEffect(() => {
    setDescriptionDraft(filters.description);
  }, [filters.description]);

  useEffect(() => {
    if (descriptionDraft === filters.description) return;
    const timer = window.setTimeout(() => {
      onFiltersChangeRef.current({ ...filtersRef.current, description: descriptionDraft });
    }, descriptionDebounceMs);
    return () => window.clearTimeout(timer);
  }, [descriptionDraft, filters.description]);

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

  function commit(next: Partial<RankingSpotFilters>) {
    onFiltersChange({ ...filters, description: descriptionDraft, ...next });
  }

  function toggle(key: 'types' | 'regions' | 'profiles', value: string) {
    commit({ [key]: toggleRankingFilterValue(filters[key], value) });
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
        <div className={styles.advancedHeader}>
          <div>
            <strong>Refine os locais</strong>
            <span>Combine os critérios para encontrar o cenário que procura.</span>
          </div>
          {count > 0 ? (
            <Button
              type="button"
              variant="quiet"
              onClick={() => {
                setDescriptionDraft('');
                onFiltersChange(emptyRankingSpotFilters);
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
        <div className={styles.advancedPrimary}>
          <div className={styles.primaryField}>
            <span>Descrição</span>
            <SearchField
              label="Filtrar por descrição"
              value={descriptionDraft}
              placeholder="Buscar no nome do local"
              onChange={(description) => {
                setDescriptionDraft(description);
                if (!description) {
                  onFiltersChange({ ...filters, description: '' });
                }
              }}
            />
          </div>
          <label className={styles.scoreField} htmlFor="ranking-minimum-score">
            <span className={styles.scoreHeader}>
              <span>Notas acima de</span>
              <output htmlFor="ranking-minimum-score">
                {filters.minimumScore === null
                  ? 'Todas'
                  : `${filters.minimumScore.toLocaleString('pt-BR')}+`}
              </output>
            </span>
            <input
              id="ranking-minimum-score"
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={filters.minimumScore ?? 0}
              aria-label="Notas acima de"
              aria-valuetext={
                filters.minimumScore === null
                  ? 'Todas as notas'
                  : `${filters.minimumScore.toLocaleString('pt-BR')} ou mais`
              }
              style={
                {
                  '--score-progress': `${((filters.minimumScore ?? 0) / 9) * 100}%`,
                } as CSSProperties
              }
              onChange={(event) =>
                commit({
                  minimumScore: Number(event.target.value) || null,
                })
              }
            />
            <span className={styles.scoreScale} aria-hidden="true">
              <span>Todas</span>
              <span>5</span>
              <span>9+</span>
            </span>
          </label>
        </div>
        <div className={styles.advancedChoices}>
          <FilterMultiSelect
            label="Tipo"
            options={spotTypes}
            selected={filters.types}
            onToggle={(value) => toggle('types', value)}
          />
          <FilterMultiSelect
            label="Região"
            options={regions.map((region) => ({
              value: region.value,
              label: region.shortLabel,
            }))}
            selected={filters.regions}
            onToggle={(value) => toggle('regions', value)}
          />
          <FilterMultiSelect
            label="Exposição"
            options={coastalProfiles}
            selected={filters.profiles}
            onToggle={(value) => toggle('profiles', value)}
          />
        </div>
      </div>
    </div>
  );
}

function FilterMultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? 'Todos'
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selecionados`;

  return (
    <details className={styles.multiSelect}>
      <summary>
        <span>
          <strong>{label}</strong>
          <small>{summary}</small>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className={styles.multiSelectOptions} role="group" aria-label={label}>
        {options.map((option) => (
          <label key={option.value} className={styles.checkOption}>
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function advancedFilterLabel(open: boolean, count: number) {
  const applied =
    count === 0 ? '' : count === 1 ? ', 1 filtro aplicado' : `, ${count} filtros aplicados`;
  return open ? `Fechar filtros avançados${applied}` : `Filtros avançados${applied}`;
}
