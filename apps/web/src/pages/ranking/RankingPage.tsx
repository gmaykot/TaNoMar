import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DateSelector } from '@/features/forecast/components/DateSelector';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import { RankingEmphasisFilters } from '@/features/ranking/components/RankingEmphasisFilters';
import { RankingList } from '@/features/ranking/components/RankingList';
import {
  parseRankingEmphasis,
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
  const premium = auth.user?.plan.code === 'premium';
  const emphasis = parseRankingEmphasis(searchParams.get('enfase'), premium);
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
      />
    );

  const activeDate = selectedDate || forecast.data.days[0]?.date || '';
  const activeDay = forecast.data.days.find((day) => day.date === activeDate);
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Visão comparativa"
        title="Os melhores locais, em ordem."
        description="Abra as condições de cada posição."
      />
      <DateSelector
        days={forecast.data.days}
        selectedDate={activeDate}
        onSelect={setSelectedDate}
      />
      <RankingEmphasisFilters emphasis={emphasis} premium={premium} onChange={setEmphasis} />
      {activeDay ? (
        <RankingList items={activeDay.ranking} emphasisKey={rankingEmphasisMetricKey(emphasis)} />
      ) : (
        <FeedbackState
          title="Sem ranking"
          description="Nenhuma previsão encontrada para esta data."
        />
      )}
    </div>
  );
}
