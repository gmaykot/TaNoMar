import { ArrowRight, Compass, Download, MapPinned, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { Button } from '@/design-system/components/Button';
import { forecastPresentation } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPlanModule, isPaidPlan, showsPartners } from '@/features/auth/types/auth';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { ForecastHero } from '@/features/forecast/components/ForecastHero';
import { useForecast } from '@/features/forecast/hooks/useForecast';
import {
  readOfflineForecast,
  saveOfflineForecast,
} from '@/features/forecast/utils/offlineForecast';
import type { FishingForecast } from '@/features/fishing/types/fishing';
import { PartnerCard } from '@/features/partners/components/PartnerCard';
import { usePartners } from '@/features/partners/hooks/usePartners';
import { RankingList } from '@/features/ranking/components/RankingList';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';
import { formatDateTime } from '@/shared/utils/formatDateTime';

export function HomePage() {
  const auth = useAuth();
  const partnersEnabled = showsPartners(auth.user);
  const forecast = useForecast();
  const partners = usePartners(partnersEnabled);
  const featured = (partners.data ?? []).filter((item) => item.isFeatured);
  const [selectedDate, setSelectedDate] = useState('');
  const [offlineForecast, setOfflineForecast] = useState<FishingForecast | null>(() =>
    readOfflineForecast(),
  );
  const [offlineSaved, setOfflineSaved] = useState(false);
  const isPaid = isPaidPlan(auth.user);
  const canCustomizeMetrics = hasPlanModule(auth.user, 'customMetrics');
  const canSaveOffline = hasPlanModule(auth.user, 'offline');
  const presentation = forecastPresentation(auth.user?.preferences, canCustomizeMetrics);
  const visibleMetricKeys = presentation.visibleMetricKeys;

  const data = forecast.data ?? (canSaveOffline && forecast.isError ? offlineForecast : undefined);

  if (forecast.isPending && !data)
    return (
      <FeedbackState
        title="Lendo o mar"
        description="Organizando as melhores janelas para você."
        icon={Compass}
        busy
      />
    );
  if (forecast.isError && !data)
    return (
      <FeedbackState
        title="Previsão indisponível"
        description="Não foi possível carregar a previsão."
        action={
          <Button variant="secondary" onClick={() => void forecast.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );

  const days = data?.days ?? [];
  const activeDate = selectedDate || days[0]?.date || '';
  if (!days.some((day) => day.ranking[0]))
    return (
      <FeedbackState
        title="Nenhum local nas previsões"
        description="Habilite locais na lista para ver a previsão aqui."
        action={<Link to="/locais?filtro=previsoes">Escolher locais</Link>}
      />
    );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={presentation.home.eyebrow}
        title={presentation.home.title}
        description={presentation.home.description}
      />
      {!isPaid ? (
        <Link className={styles.premiumBanner} to={routes.premium}>
          <span>
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <div>
            <strong>{presentation.home.premiumTitle}</strong>
            <small>Arrais, Mestre ou Capitão: mais dias, detalhes do mar e alertas.</small>
          </div>
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
      ) : null}
      <DayCarousel days={days} selectedDate={activeDate} onSelect={setSelectedDate}>
        {(day) =>
          day.ranking[0] ? (
            <>
              <ForecastHero
                forecast={day.ranking[0]}
                date={day.date}
                dayLabel={day.label}
                generatedAt={formatDateTime(data?.generatedAt ?? '')}
                visibleMetricKeys={visibleMetricKeys}
                windUnit={auth.user?.preferences.windUnit}
                showFishingScore={presentation.showFishingScore}
              />
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
                <RankingList
                  items={day.ranking.slice(1)}
                  limit={3}
                  startAt={2}
                  visibleMetricKeys={visibleMetricKeys}
                  windUnit={auth.user?.preferences.windUnit}
                  showFishingScore={presentation.showFishingScore}
                />
              </section>
            </>
          ) : (
            <FeedbackState
              title="Nenhum local nas previsões"
              description="Habilite locais na lista para ver a previsão aqui."
              action={<Link to="/locais?filtro=previsoes">Escolher locais</Link>}
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
      {canSaveOffline ? (
        <div className={styles.homeActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!data) return;
              setOfflineSaved(saveOfflineForecast(data));
              setOfflineForecast(data);
            }}
          >
            <Download size={17} aria-hidden="true" />
            {offlineSaved || offlineForecast
              ? 'Previsão salva nesta sessão'
              : 'Salvar para usar offline'}
          </Button>
          {offlineForecast && !forecast.data ? (
            <small>
              Exibindo a última previsão salva nesta sessão. Ela pode estar desatualizada.
            </small>
          ) : null}
        </div>
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
