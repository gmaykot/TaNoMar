import { ArrowRight, Compass, MapPinned } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { ForecastHero } from '@/features/forecast/components/ForecastHero';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import { RankingList } from '@/features/ranking/components/RankingList';
import { PageHeader } from '@/pages/shared/PageHeader';
import styles from '@/pages/shared/pages.module.css';

export function HomePage() {
  const forecast = useForecast();
  const [selectedDate, setSelectedDate] = useState('');

  if (forecast.isPending)
    return (
      <FeedbackState
        title="Lendo o mar"
        description="Organizando as melhores janelas para você."
        icon={Compass}
        busy
      />
    );
  if (forecast.isError)
    return (
      <FeedbackState
        title="Previsão indisponível"
        description="Não foi possível carregar a previsão."
      />
    );

  const days = forecast.data.days;
  const activeDate = selectedDate || days[0]?.date || '';
  if (!days.some((day) => day.ranking[0]))
    return (
      <FeedbackState
        title="Sem previsão"
        description="Nenhuma condição foi encontrada para este dia."
      />
    );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Decisão de pesca"
        title="Onde vale pescar hoje?"
        description="Comparamos vento, ondas, chuva e temperatura para mostrar o melhor momento."
      />
      <DayCarousel days={days} selectedDate={activeDate} onSelect={setSelectedDate}>
        {(day) =>
          day.ranking[0] ? (
            <>
              <ForecastHero forecast={day.ranking[0]} />
              <section className={styles.section} aria-labelledby={`ranking-${day.date}`}>
                <div className={styles.sectionHeader}>
                  <div>
                    <span>Outras boas escolhas</span>
                    <h2 id={`ranking-${day.date}`}>Ranking do dia</h2>
                  </div>
                  <Link to="/ranking">
                    Ver todos <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </div>
                <RankingList items={day.ranking.slice(1)} limit={3} />
              </section>
            </>
          ) : (
            <FeedbackState
              title="Sem previsão"
              description="Nenhuma condição foi encontrada para este dia."
            />
          )
        }
      </DayCarousel>
      <Link className={styles.exploreCard} to="/locais">
        <span>
          <MapPinned size={22} aria-hidden="true" />
        </span>
        <div>
          <strong>Explore todos os locais</strong>
          <small>Veja os pontos monitorados em Florianópolis</small>
        </div>
        <ArrowRight size={19} aria-hidden="true" />
      </Link>
    </div>
  );
}
