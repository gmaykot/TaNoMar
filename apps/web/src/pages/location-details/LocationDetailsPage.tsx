import {
  ArrowLeft,
  Cloud,
  CloudRain,
  CloudSun,
  Eye,
  EyeOff,
  Heart,
  Lock,
  MapPin,
  Navigation,
  Pencil,
  Sun,
} from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { forecastPresentation } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { WebcamLiveView } from '@/features/webcam/components/WebcamCard';
import { WebcamManager } from '@/features/webcam/components/WebcamManager';
import { hasLiveWebcams, hasPlanModule, isAdmin, showsAppFocus } from '@/features/auth/types/auth';
import { CommunityReports } from '@/features/community/components/CommunityReports';
import { PlanTripAction } from '@/features/diary/components/PlanTripAction';
import { SubscriptionGateDrawer } from '@/features/subscription/components/SubscriptionGateDrawer';
import type { ForecastRankingItem } from '@/features/fishing/types/fishing';
import { DayCarousel } from '@/features/forecast/components/DayCarousel';
import { ForecastHero } from '@/features/forecast/components/ForecastHero';
import { MarineDetails, MarineDetailsToggle } from '@/features/forecast/components/MarineDetails';
import { useMarineDetails } from '@/features/forecast/hooks/useMarineDetails';
import { marineSeriesAtHour } from '@/features/forecast/utils/marineAtHour';
import { useLocationForecast } from '@/features/forecast/hooks/useForecast';
import { LocationStampFor } from '@/features/locations/components/LocationStamp';
import { useLocationMutations } from '@/features/locations/hooks/useLocationMutations';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function LocationDetailsPage() {
  const { locationId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const locationForecast = useLocationForecast(locationId);
  const mutations = useLocationMutations();
  const canFavorite = (auth.user?.entitlements.maxFavorites ?? 0) > 0;
  const canDiary = hasPlanModule(auth.user, 'diary');
  const canWatchWebcams = hasLiveWebcams(auth.user);
  const canManageWebcams = isAdmin(auth.user);
  const presentation = forecastPresentation(
    auth.user?.preferences,
    hasPlanModule(auth.user, 'customMetrics'),
    showsAppFocus(auth.user),
  );
  const visibleMetricKeys = presentation.visibleMetricKeys;
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('data') ?? '');
  const [marineOpen, setMarineOpen] = useState(presentation.preferMarineDetails);
  const [favoriteGateOpen, setFavoriteGateOpen] = useState(false);

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

  const favoriteLocked = !canFavorite && !location.isFavorite;
  const detailMetricKeys = visibleMetricKeys?.map((key) => (key === 'rain' ? 'pressure' : key));
  const toolbarActions: { key: string; locked: boolean; node: ReactNode }[] = [
    {
      key: 'plan',
      locked: !canDiary,
      node: (
        <PlanTripAction
          spotId={location.id}
          spotName={location.name}
          date={activeDate}
          time={activeDay.forecast.bestWindow}
        />
      ),
    },
    {
      key: 'enabled',
      locked: false,
      node: (
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
      ),
    },
    {
      key: 'favorite',
      locked: favoriteLocked,
      node: (
        <Button
          type="button"
          variant="secondary"
          locked={favoriteLocked}
          aria-label={favoriteLocked ? 'Favoritar. Disponível na assinatura.' : undefined}
          onClick={() => {
            if (favoriteLocked) {
              setFavoriteGateOpen(true);
              return;
            }
            mutations.favorite.mutate({
              spotId: location.id,
              isFavorite: !location.isFavorite,
            });
          }}
        >
          {favoriteLocked ? (
            <Lock size={16} aria-hidden="true" />
          ) : (
            <Heart
              size={16}
              fill={location.isFavorite ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          )}
          {location.isFavorite ? 'Favorito' : 'Favoritar'}
        </Button>
      ),
    },
  ];
  if (location.isOwner) {
    toolbarActions.push({
      key: 'edit',
      locked: false,
      node: (
        <Link className={styles.backLink} to={routes.locationEdit(location.id)}>
          <Pencil size={16} aria-hidden="true" /> Editar
        </Link>
      ),
    });
  }
  const orderedToolbar = [
    ...toolbarActions.filter((item) => !item.locked),
    ...toolbarActions.filter((item) => item.locked),
  ];

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
      <div
        className={`${styles.toolbar} ${styles.locationToolbar}`}
        role="toolbar"
        aria-label="Ações do local"
      >
        {orderedToolbar.map((item) => (
          <Fragment key={item.key}>{item.node}</Fragment>
        ))}
      </div>
      {favoriteGateOpen ? (
        <SubscriptionGateDrawer action="Favoritar" onCancel={() => setFavoriteGateOpen(false)} />
      ) : null}
      {canManageWebcams ? (
        <WebcamManager spotId={location.id} />
      ) : canWatchWebcams && location.hasLiveWebcam ? (
        <WebcamLiveView spotId={location.id} />
      ) : canWatchWebcams ? (
        <p className={styles.webcamEmpty}>Sem câmera ao vivo neste local.</p>
      ) : null}
      {mutations.favoriteError ? <p>{mutations.favoriteError}</p> : null}
      {mutations.enabledError ? <p>{mutations.enabledError}</p> : null}
      <DayCarousel days={days} selectedDate={activeDate} onSelect={setSelectedDate}>
        {(day) => (
          <LocationForecastHero
            day={day}
            activeDate={activeDate}
            locationId={location.id}
            visibleMetricKeys={visibleMetricKeys}
            detailMetricKeys={detailMetricKeys}
            windUnit={auth.user?.preferences.windUnit}
            showFishingScore={presentation.showFishingScore}
            marineOpen={marineOpen}
            onMarineToggle={setMarineOpen}
          />
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

function WeatherCondition({ forecast }: { forecast: ForecastRankingItem }) {
  const rain = forecast.metrics.find((metric) => metric.key === 'rain');
  const probability = rain ? parseRainProbability(rain.value) : null;
  if (probability === null) return null;

  const weather =
    probability <= 20
      ? { label: 'Sol', icon: Sun }
      : probability <= 40
        ? { label: 'Parcialmente nublado', icon: CloudSun }
        : probability <= 60
          ? { label: 'Nublado', icon: Cloud }
          : { label: 'Chuva', icon: CloudRain };
  const WeatherIcon = weather.icon;

  return (
    <div className={styles.weatherCondition} aria-label={`Condição do tempo: ${weather.label}`}>
      <WeatherIcon size={28} aria-hidden="true" />
      <span>
        <strong>{weather.label}</strong>
        <small>{probability}% de chance de chuva</small>
      </span>
    </div>
  );
}

function parseRainProbability(value: string) {
  const match = /(\d+(?:[.,]\d+)?)%/.exec(value);
  if (!match) return null;
  const probability = Number(match[1]!.replace(',', '.'));
  return Number.isFinite(probability) ? probability : null;
}

interface LocationForecastHeroProps {
  day: { date: string; label: string; forecast: ForecastRankingItem };
  activeDate: string;
  locationId: string;
  visibleMetricKeys?: ForecastRankingItem['metrics'][number]['key'][];
  detailMetricKeys?: ForecastRankingItem['metrics'][number]['key'][];
  windUnit?: string;
  showFishingScore: boolean;
  marineOpen: boolean;
  onMarineToggle: (open: boolean) => void;
}

function LocationForecastHero({
  day,
  activeDate,
  locationId,
  visibleMetricKeys,
  detailMetricKeys,
  windUnit,
  showFishingScore,
  marineOpen,
  onMarineToggle,
}: LocationForecastHeroProps) {
  const [selectedHour, setSelectedHour] = useState(day.forecast.metricsHour);
  const marine = useMarineDetails(
    locationId,
    day.date,
    day.date === activeDate && !day.forecast.pressure,
  );
  const marinePressure = marine.data?.series.find((item) => item.key === 'atmospheric-pressure');
  const pressureForHour = marinePressure
    ? marineSeriesAtHour(marinePressure, selectedHour, day.forecast.metricsHour)
    : undefined;

  return (
    <ForecastHero
      forecast={day.forecast}
      dayLabel={day.label}
      visibleMetricKeys={detailMetricKeys}
      windUnit={windUnit}
      showFishingScore={showFishingScore}
      showLocationStamp={false}
      showLocationName={false}
      showLocationLink={false}
      hideLockedMetrics={false}
      selectedHour={selectedHour}
      onHourSelect={(hour) => setSelectedHour(hour)}
      adaptMetrics={(item) => locationDetailMetrics(item, pressureForHour)}
      beforeMetrics={(item) => <WeatherCondition forecast={item} />}
      afterTrend={
        <MarineDetailsToggle open={marineOpen} onToggle={onMarineToggle}>
          {marineOpen && day.date === activeDate ? (
            <MarineDetails
              locationId={locationId}
              date={day.date}
              selectedHour={selectedHour}
              referenceHour={day.forecast.metricsHour}
              visibleMetricKeys={visibleMetricKeys}
            />
          ) : null}
        </MarineDetailsToggle>
      }
    />
  );
}

function locationDetailMetrics(
  forecast: ForecastRankingItem,
  marinePressure?: { current: string; detail?: string; locked?: boolean; unavailable?: boolean },
) {
  const pressure =
    forecast.pressure ??
    (marinePressure && !marinePressure.unavailable
      ? {
          key: 'pressure' as const,
          label: 'Pressão',
          value: marinePressure.current,
          detail: marinePressure.detail,
          locked: marinePressure.locked,
        }
      : undefined);
  return pressure
    ? forecast.metrics.map((metric) => (metric.key === 'rain' ? pressure : metric))
    : forecast.metrics.filter((metric) => metric.key !== 'rain');
}
