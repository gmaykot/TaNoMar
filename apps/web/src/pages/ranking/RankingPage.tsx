import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { DateSelector } from '@/features/forecast/components/DateSelector';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import { RankingList } from '@/features/ranking/components/RankingList';
import { PageHeader } from '@/pages/shared/PageHeader';
import styles from '@/pages/shared/pages.module.css';

export function RankingPage() {
  const forecast = useForecast();
  const [selectedDate, setSelectedDate] = useState('');
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
        description="Abra as condições para entender o que sustenta cada posição."
      />
      <DateSelector
        days={forecast.data.days}
        selectedDate={activeDate}
        onSelect={setSelectedDate}
      />
      {activeDay ? (
        <RankingList items={activeDay.ranking} />
      ) : (
        <FeedbackState
          title="Sem ranking"
          description="Nenhuma previsão encontrada para esta data."
        />
      )}
    </div>
  );
}
