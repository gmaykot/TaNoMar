import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { Button } from '@/design-system/components/Button';
import { forecastPresentation } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPlanModule, showsAppFocus } from '@/features/auth/types/auth';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import { RankingEmphasisFilters } from '@/features/ranking/components/RankingEmphasisFilters';
import { RankingList } from '@/features/ranking/components/RankingList';
import {
  parseRankingEmphasis,
  rankingEmphasisMetric,
  rankingEmphasisMetricKey,
  rankingEmphasisParam,
  rankingEmphasisQueryValue,
  type RankingEmphasis,
} from '@/features/ranking/rankingEmphasis';
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
      <RankingEmphasisFilters
        emphasis={emphasis}
        premium={canEmphasis}
        visibleMetricKeys={visibleMetricKeys}
        onChange={setEmphasis}
      />
      <DayCarousel days={forecast.data.days} selectedDate={activeDate} onSelect={setSelectedDate}>
        {(day) => (
          <>
            {day.ranking.length ? (
              <RankingList
                items={day.ranking}
                emphasisKey={rankingEmphasisMetricKey(emphasis)}
                visibleMetricKeys={visibleMetricKeys}
                windUnit={auth.user?.preferences.windUnit}
                showFishingScore={presentation.showFishingScore}
              />
            ) : (
              <FeedbackState
                title="Nenhum local nas previsões"
                description="Habilite locais na lista para compará-los aqui."
                action={<Link to="/locais?filtro=previsoes">Escolher locais</Link>}
              />
            )}
          </>
        )}
      </DayCarousel>
    </div>
  );
}
