import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Eye,
  EyeOff,
  Heart,
  Lock,
  MapPin,
  Navigation,
  Pencil,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import { forecastPresentation, locationPrimaryMetricKeys } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { WebcamLiveView } from '@/features/webcam/components/WebcamCard';
import { WebcamManager } from '@/features/webcam/components/WebcamManager';
import { WebcamPremiumGate } from '@/features/webcam/components/WebcamPremiumGate';
import {
  hasLiveWebcams,
  hasPlanModule,
  isAdmin,
  showsAppFocus,
  SUBSCRIPTION_LOCK_LABEL,
} from '@/features/auth/types/auth';
import { CommunityReports } from '@/features/community/components/CommunityReports';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { MarineDetails, MarineDetailsToggle } from '@/features/forecast/components/MarineDetails';
import { MetricGrid } from '@/features/forecast/components/MetricGrid';
import { useLocationForecast } from '@/features/forecast/hooks/useForecast';
import { formatScore, metricsHourCaption } from '@/features/fishing/utils/scoreBreakdown';
import { LocationStampFor } from '@/features/locations/components/LocationStamp';
import { useLocationMutations } from '@/features/locations/hooks/useLocationMutations';
import { saveTripPlan } from '@/features/diary/diaryStorage';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function LocationDetailsPage() {
  const { locationId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const locationForecast = useLocationForecast(locationId);
  const mutations = useLocationMutations();
  const canFavorite = (auth.user?.entitlements.maxFavorites ?? 0) > 0;
  const canWatchWebcams = hasLiveWebcams(auth.user);
  const canManageWebcams = (location: { isOwner: boolean; visibility: string }) =>
    isAdmin(auth.user) ||
    (location.isOwner && location.visibility !== 'official' && canWatchWebcams);
  const presentation = forecastPresentation(
    auth.user?.preferences,
    hasPlanModule(auth.user, 'customMetrics'),
    showsAppFocus(auth.user),
  );
  const visibleMetricKeys = presentation.visibleMetricKeys;
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('data') ?? '');
  const [marineOpen, setMarineOpen] = useState(presentation.preferMarineDetails);
  const [planned, setPlanned] = useState(false);

  if (locationForecast.isPending)
    return (
      <FeedbackState
        title="Lendo este local"
        description="Organizando a previsão dos próximos dias."
        busy
      />
    );
  if (locationForecast.isError)
    return (
      <FeedbackState
        title="Previsão indisponível"
        description="Não foi possível abrir este local."
        action={
          <Button variant="secondary" onClick={() => void locationForecast.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  if (!locationForecast.data)
    return (
      <FeedbackState
        title="Local não encontrado"
        description="Esse ponto ainda não faz parte do mapa TáNoMar."
      />
    );

  const { location, days } = locationForecast.data;
  const activeDate = days.some((day) => day.date === selectedDate)
    ? selectedDate
    : days[0]?.date || '';
  const activeDay = days.find((day) => day.date === activeDate);
  if (!activeDay)
    return (
      <FeedbackState
        title="Sem previsão"
        description="Nenhuma condição disponível para este local."
      />
    );

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.locations}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar aos locais
      </Link>
      <section className={styles.locationHero}>
        <LocationStampFor isOwner={location.isOwner} visibility={location.visibility} />
        <div className={styles.locationIntro}>
          <span>
            <MapPin size={16} aria-hidden="true" /> {location.region}
          </span>
          <h1>{location.name}</h1>
          <p>
            {location.city}, {location.state}
            {location.visibility === 'private'
              ? ' · Privado'
              : location.visibility === 'shared' && !location.isApproved
                ? ' · Aguardando aprovação'
                : location.visibility === 'shared'
                  ? ' · Comunidade'
                  : ''}
          </p>
        </div>
        <div className={styles.coordinateMark} aria-label="Local monitorado">
          <Navigation size={24} />
        </div>
      </section>
      <div className={styles.toolbar}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            saveTripPlan({
              spotId: location.id,
              spotName: location.name,
              date: activeDate,
              time: activeDay.forecast.bestWindow,
              notes: '',
            });
            setPlanned(true);
          }}
        >
          <CalendarPlus size={16} aria-hidden="true" /> Planejar saída
        </Button>
        {planned ? <span role="status">Saída planejada neste aparelho.</span> : null}
        <Button
          type="button"
          variant="secondary"
          aria-pressed={location.isEnabled}
          onClick={() => {
            mutations.enabled.mutate({
              spotId: location.id,
              isEnabled: !location.isEnabled,
            });
          }}
        >
          {location.isEnabled ? (
            <Eye size={16} aria-hidden="true" />
          ) : (
            <EyeOff size={16} aria-hidden="true" />
          )}
          {location.isEnabled ? 'Nas previsões' : 'Fora das previsões'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          locked={!canFavorite && !location.isFavorite}
          aria-label={
            !canFavorite && !location.isFavorite ? 'Favoritar bloqueado no plano atual' : undefined
          }
          onClick={() => {
            if (!canFavorite && !location.isFavorite) return;
            mutations.favorite.mutate({
              spotId: location.id,
              isFavorite: !location.isFavorite,
            });
          }}
        >
          {!canFavorite && !location.isFavorite ? (
            <Lock size={16} aria-hidden="true" />
          ) : (
            <Heart
              size={16}
              fill={location.isFavorite ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          )}
          {!canFavorite && !location.isFavorite
            ? SUBSCRIPTION_LOCK_LABEL
            : location.isFavorite
              ? 'Favorito'
              : 'Favoritar'}
        </Button>
        {location.isOwner ? (
          <Link className={styles.backLink} to={routes.locationEdit(location.id)}>
            <Pencil size={16} aria-hidden="true" /> Editar
          </Link>
        ) : null}
      </div>
      {canManageWebcams(location) ? (
        <WebcamManager spotId={location.id} admin={isAdmin(auth.user)} />
      ) : location.hasLiveWebcam && canWatchWebcams ? (
        <WebcamLiveView spotId={location.id} />
      ) : location.hasLiveWebcam ? (
        <WebcamPremiumGate />
      ) : null}
      {mutations.favoriteError ? <p>{mutations.favoriteError}</p> : null}
      {mutations.enabledError ? <p>{mutations.enabledError}</p> : null}
      <DayCarousel days={days} selectedDate={activeDate} onSelect={setSelectedDate}>
        {(day) => (
          <Card as="section" className={styles.detailCard} elevated>
            {presentation.showFishingScore ? (
              <>
                <div className={styles.detailSummary}>
                  <div>
                    <span className={styles.detailEyebrow}>Melhor janela</span>
                    <h2>{day.forecast.bestWindow}</h2>
                    <Badge classification={day.forecast.classification} />
                    {day.forecast.scoreBreakdown ? (
                      <p className={styles.scoreBreakdown}>{day.forecast.scoreBreakdown}</p>
                    ) : null}
                  </div>
                  <ScoreIndicator
                    score={day.forecast.score}
                    classification={day.forecast.classification}
                  />
                </div>
                <div className={styles.bestHours}>
                  <CalendarDays size={17} aria-hidden="true" />
                  <span>Horários em destaque:</span>
                  {day.forecast.hourWindows.length > 0
                    ? day.forecast.hourWindows.map((hour) => (
                        <strong key={hour.time}>
                          {hour.time} {formatScore(hour.score)}
                        </strong>
                      ))
                    : day.forecast.bestHours.map((hour) => <strong key={hour}>{hour}</strong>)}
                </div>
              </>
            ) : null}
            {metricsHourCaption(day.forecast.metricsHour) ? (
              <p className={styles.metricCaption}>{metricsHourCaption(day.forecast.metricsHour)}</p>
            ) : null}
            <MetricGrid
              metrics={day.forecast.metrics}
              keys={locationPrimaryMetricKeys(presentation.focus).filter(
                (key) => !visibleMetricKeys || visibleMetricKeys.includes(key),
              )}
              windUnit={auth.user?.preferences.windUnit}
            />
            <MarineDetailsToggle open={marineOpen} onToggle={setMarineOpen}>
              {marineOpen && day.date === activeDate ? (
                <MarineDetails locationId={location.id} date={day.date} />
              ) : null}
            </MarineDetailsToggle>
          </Card>
        )}
      </DayCarousel>
      {presentation.showCommunity ? (
        <CommunityReports
          spotId={location.id}
          canReport={
            location.visibility === 'official' ||
            (location.visibility === 'shared' && location.isApproved)
          }
          canVote={hasPlanModule(auth.user, 'communityVote')}
        />
      ) : null}
    </div>
  );
}
