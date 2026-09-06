import { ArrowRight, Compass, MapPinned } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showsPartners } from '@/features/auth/types/auth';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { ForecastHero } from '@/features/forecast/components/ForecastHero';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import { PartnerCard } from '@/features/partners/components/PartnerCard';
import { usePartners } from '@/features/partners/hooks/usePartners';
import { RankingList } from '@/features/ranking/components/RankingList';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function HomePage() {
  const auth = useAuth();
  const partnersEnabled = showsPartners(auth.user);
  const forecast = useForecast();
  const partners = usePartners(partnersEnabled);
  const featured = (partners.data ?? []).filter((item) => item.isFeatured);
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
        title="Nenhum local nas previsões"
        description="Habilite locais na lista para ver a previsão aqui."
      />
    );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Decisão de pesca"
        title="Onde vale pescar hoje?"
        description="Vento, ondas, chuva e temperatura no melhor momento."
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
              title="Nenhum local nas previsões"
              description="Habilite locais na lista para ver a previsão aqui."
            />
          )
        }
      </DayCarousel>
      {featured.length > 0 ? (
        <section className={styles.section} aria-labelledby="home-partners">
          <div className={styles.sectionHeader}>
            <div>
              <span>Lojas e guias da ilha</span>
              <h2 id="home-partners">Parceiros</h2>
            </div>
            <Link to={routes.partners}>
              Ver todos <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.locationGrid}>
            {featured.map((partner) => (
              <PartnerCard key={partner.slug} partner={partner} />
            ))}
          </div>
        </section>
      ) : null}
      <Link className={styles.exploreCard} to="/locais">
        <span>
          <MapPinned size={22} aria-hidden="true" />
        </span>
        <div>
          <strong>Explore todos os locais</strong>
          <small>Habilite os pontos que entram nas previsões</small>
        </div>
        <ArrowRight size={19} aria-hidden="true" />
      </Link>
    </div>
  );
}
