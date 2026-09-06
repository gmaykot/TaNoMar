import {
  ArrowLeft,
  CalendarDays,
  Eye,
  EyeOff,
  Heart,
  Lock,
  MapPin,
  Navigation,
  Pencil,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CommunityReports } from '@/features/community/components/CommunityReports';
import { DateSelector } from '@/features/forecast/components/DateSelector';
import { MarineDetails, MarineDetailsToggle } from '@/features/forecast/components/MarineDetails';
import { MetricGrid } from '@/features/forecast/components/MetricGrid';
import { useLocationForecast } from '@/features/forecast/hooks/useForecast';
import { useLocationMutations } from '@/features/locations/hooks/useLocationMutations';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function LocationDetailsPage() {
  const { locationId = '' } = useParams();
  const auth = useAuth();
  const locationForecast = useLocationForecast(locationId);
  const mutations = useLocationMutations();
  const canFavorite = (auth.user?.entitlements.maxFavorites ?? 0) > 0;
  const [selectedDate, setSelectedDate] = useState('');
  const [marineOpen, setMarineOpen] = useState(false);

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
  const activeDate = selectedDate || days[0]?.date || '';
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
        {location.isOwner ? (
          <span className={styles.ownerBadge}>
            <Star size={14} fill="currentColor" aria-hidden="true" />
            Meu local
          </span>
        ) : null}
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
            ? 'Premium'
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
      {mutations.favoriteError ? <p>{mutations.favoriteError}</p> : null}
      {mutations.enabledError ? <p>{mutations.enabledError}</p> : null}
      <DateSelector
        days={days.map((day) => ({ ...day, ranking: [day.forecast] }))}
        selectedDate={activeDate}
        onSelect={setSelectedDate}
      />
      <Card as="section" className={styles.detailCard} elevated>
        <div className={styles.detailSummary}>
          <div>
            <span className={styles.detailEyebrow}>Melhor janela</span>
            <h2>{activeDay.forecast.bestWindow}</h2>
            <Badge classification={activeDay.forecast.classification} />
          </div>
          <ScoreIndicator
            score={activeDay.forecast.score}
            classification={activeDay.forecast.classification}
          />
        </div>
        <div className={styles.bestHours}>
          <CalendarDays size={17} aria-hidden="true" />
          <span>Horários em destaque:</span>
          {activeDay.forecast.bestHours.map((hour) => (
            <strong key={hour}>{hour}</strong>
          ))}
        </div>
        <MetricGrid
          metrics={activeDay.forecast.metrics}
          keys={['wind', 'gusts', 'rain', 'air-temperature']}
        />
        <MarineDetailsToggle open={marineOpen} onToggle={setMarineOpen}>
          {marineOpen ? <MarineDetails locationId={location.id} date={activeDate} /> : null}
        </MarineDetailsToggle>
      </Card>
      <CommunityReports
        spotId={location.id}
        canReport={
          location.visibility === 'official' ||
          (location.visibility === 'shared' && location.isApproved)
        }
        canVote={auth.user?.plan.code === 'premium'}
      />
    </div>
  );
}
