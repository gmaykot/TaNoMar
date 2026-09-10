import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { Button } from '@/design-system/components/Button';
import { forecastPresentation } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPlanModule, showsAppFocus } from '@/features/auth/types/auth';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { RankingFilters } from '@/features/ranking/components/RankingFilters';
import { RankingList, rankingPageSize } from '@/features/ranking/components/RankingList';
import {
  parseRankingEmphasis,
  rankingEmphasisMetric,
  rankingEmphasisMetricKey,
  rankingEmphasisParam,
  rankingEmphasisQueryValue,
  type RankingEmphasis,
} from '@/features/ranking/rankingEmphasis';
import {
  emptyRankingSpotFilters,
  filterRankingBySpot,
  parseRankingSpotFilters,
  rankingSpotFilterCount,
  writeRankingSpotFilters,
} from '@/features/ranking/rankingSpotFilters';
import { PageHeader } from '@/pages/shared/PageHeader';
import styles from '@/pages/shared/pages.module.css';

export function RankingPage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState('');
  const canCustomizeMetrics = hasPlanModule(auth.user, 'customMetrics');
  const canEmphasis = hasPlanModule(auth.user, 'rankingEmphasis');
  const presentation = forecastPresentation(
    auth.user?.preferences,
    canCustomizeMetrics,
    showsAppFocus(auth.user),
  );
  const visibleMetricKeys = presentation.visibleMetricKeys;
  const requestedEmphasis = parseRankingEmphasis(searchParams.get('enfase'), canEmphasis);
  const emphasisMetric = rankingEmphasisMetric(requestedEmphasis);
  const emphasis =
    !visibleMetricKeys || !emphasisMetric || visibleMetricKeys.includes(emphasisMetric)
      ? requestedEmphasis
      : 'score';
  const forecast = useForecast(rankingEmphasisParam(emphasis));
  const locations = useLocations();
  const filters = parseRankingSpotFilters(searchParams);
  const locationById = useMemo(
    () => new Map((locations.data ?? []).map((location) => [location.id, location])),
    [locations.data],
  );

  function setEmphasis(next: RankingEmphasis) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        const query = rankingEmphasisQueryValue(next);
        if (query) params.set('enfase', query);
        else params.delete('enfase');
        return params;
      },
      { replace: true },
    );
  }

  function setFilters(next: typeof filters) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        writeRankingSpotFilters(params, next);
        return params;
      },
      { replace: true },
    );
  }

  if (forecast.isPending)
    return (
      <FeedbackState
        title="Montando o ranking"
        description="Comparando as condições de cada local."
        icon={BarChart3}
        busy
      />
    );
  if (forecast.isError)
    return (
      <FeedbackState
        title="Ranking indisponível"
        description="Não foi possível carregar o ranking."
        action={
          <Button variant="secondary" onClick={() => void forecast.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );

  const activeDate = selectedDate || forecast.data.days[0]?.date || '';
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={presentation.ranking.eyebrow}
        title={presentation.ranking.title}
        description={presentation.ranking.description}
      />
      <RankingFilters
        emphasis={emphasis}
        premium={canEmphasis}
        visibleMetricKeys={visibleMetricKeys}
        onEmphasisChange={setEmphasis}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <DayCarousel days={forecast.data.days} selectedDate={activeDate} onSelect={setSelectedDate}>
        {(day) => {
          const items = filterRankingBySpot(day.ranking, locationById, filters);
          if (items.length) {
            return (
              <RankingList
                items={items}
                pageSize={rankingPageSize}
                emphasisKey={rankingEmphasisMetricKey(emphasis)}
                visibleMetricKeys={visibleMetricKeys}
                windUnit={auth.user?.preferences.windUnit}
                showFishingScore={presentation.showFishingScore}
              />
            );
          }
          if (day.ranking.length && rankingSpotFilterCount(filters) > 0) {
            return (
              <FeedbackState
                title="Nenhum local com esses filtros"
                description="Ajuste o tipo, a região ou a exposição para ver o ranking."
                action={
                  <Button variant="secondary" onClick={() => setFilters(emptyRankingSpotFilters)}>
                    Limpar filtros
                  </Button>
                }
              />
            );
          }
          return (
            <FeedbackState
              title="Nenhum local nas previsões"
              description="Habilite locais na lista para compará-los aqui."
              action={<Link to="/locais?filtro=previsoes">Escolher locais</Link>}
            />
          );
        }}
      </DayCarousel>
    </div>
  );
}
