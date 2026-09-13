import { Compass, Navigation } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { boatDisclaimer } from '../arrival/arrivalModes';
import {
  bearingDegrees,
  compassLabel,
  distanceToSpotMeters,
  formatBearing,
  formatCoordinatePair,
  formatDistance,
  headingDelta,
} from '../arrival/geoMath';
import { currentMapsUserAgent, mapsPinUrl } from '../arrival/mapsLinks';
import type { GeolocationWatchStatus } from '../hooks/useGeolocationWatch';
import styles from './arrival.module.css';

interface LocationHeadingViewProps {
  name: string;
  latitude: number;
  longitude: number;
  geoStatus: GeolocationWatchStatus;
  userLatitude: number | null;
  userLongitude: number | null;
  accuracy: number | null;
  heading: number | null;
  needsCompassPermission: boolean;
  onEnableCompass: () => void;
}

function geoCopy(status: GeolocationWatchStatus) {
  if (status === 'denied') {
    return {
      title: 'Localização bloqueada',
      description: 'Autorize a localização neste aparelho para ver rumo e distância até o local.',
    };
  }
  if (status === 'unsupported') {
    return {
      title: 'Sem GPS neste aparelho',
      description: 'Abra o ponto no mapa ou use as coordenadas em um GPS marítimo.',
    };
  }
  if (status === 'error') {
    return {
      title: 'Não foi possível ler sua posição',
      description: 'Tente de novo em área aberta, ou abra o ponto no mapa.',
    };
  }
  return {
    title: 'Lendo sua posição',
    description: 'O rumo aparece assim que o GPS deste aparelho responder.',
  };
}

function headingInstruction(turn: number | null) {
  if (turn == null) return 'Norte no topo da rosa.';
  if (Math.abs(turn) < 20) return 'Siga em frente.';
  return turn > 0 ? 'Vire à direita.' : 'Vire à esquerda.';
}

export function LocationHeadingView({
  name,
  latitude,
  longitude,
  geoStatus,
  userLatitude,
  userLongitude,
  accuracy,
  heading,
  needsCompassPermission,
  onEnableCompass,
}: LocationHeadingViewProps) {
  const pinHref = mapsPinUrl(latitude, longitude, name, currentMapsUserAgent());
  const ready = geoStatus === 'ready' && userLatitude != null && userLongitude != null;
  const bearing = ready ? bearingDegrees(userLatitude, userLongitude, latitude, longitude) : null;
  const distance = ready
    ? formatDistance(distanceToSpotMeters(userLatitude, userLongitude, latitude, longitude))
    : null;
  const roseRotation = heading == null ? 0 : -heading;
  const turn = heading != null && bearing != null ? headingDelta(heading, bearing) : null;
  const accuracyLabel =
    accuracy != null && Number.isFinite(accuracy)
      ? accuracy >= 50
        ? `Posição aproximada · precisão ${formatDistance(accuracy)}`
        : `Precisão ${formatDistance(accuracy)}`
      : null;
  const copy = geoCopy(geoStatus);

  return (
    <div className={styles.heading}>
      {ready && bearing != null ? (
        <div className={styles.compassWrap}>
          <div
            className={styles.compass}
            role="img"
            aria-label={`Rumo ${formatBearing(bearing)} ${compassLabel(bearing)}${
              distance ? `, faltam ${distance}` : ''
            }`}
          >
            <div
              className={styles.compassRose}
              style={{ transform: `rotate(${roseRotation}deg)` }}
              aria-hidden="true"
            >
              <span className={styles.compassPoint}>N</span>
              <span className={styles.compassPoint} data-cardinal="l">
                L
              </span>
              <span className={styles.compassPoint} data-cardinal="s">
                S
              </span>
              <span className={styles.compassPoint} data-cardinal="o">
                O
              </span>
              <span
                className={styles.needle}
                style={{ transform: `translate(-50%, -100%) rotate(${bearing}deg)` }}
              />
              <span className={styles.hub} />
            </div>
          </div>
          <p className={styles.bearing}>
            {formatBearing(bearing)} {compassLabel(bearing)}
            <span>{headingInstruction(turn)}</span>
          </p>
        </div>
      ) : (
        <FeedbackState
          icon={Compass}
          title={copy.title}
          description={copy.description}
          busy={geoStatus === 'locating'}
        />
      )}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Distância em linha reta</span>
          <strong>{distance ?? '—'}</strong>
        </div>
        <div className={styles.metric}>
          <span>Coordenadas do local</span>
          <strong>{formatCoordinatePair(latitude, longitude)}</strong>
        </div>
        {accuracyLabel ? (
          <p className={styles.coords} role="status">
            {accuracyLabel}
          </p>
        ) : null}
      </div>
      {needsCompassPermission ? (
        <Button type="button" variant="secondary" onClick={() => void onEnableCompass()}>
          Ativar bússola
        </Button>
      ) : null}
      <p className={styles.notice}>{boatDisclaimer()}</p>
      <div className={styles.actions}>
        <a className={styles.mapButton} href={pinHref} rel="noopener noreferrer" target="_blank">
          <Navigation size={16} aria-hidden="true" /> Abrir no mapa
        </a>
      </div>
    </div>
  );
}
