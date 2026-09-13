import { AlertTriangle, Compass, Navigation } from 'lucide-react';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { headingDisclaimer } from '../arrival/arrivalModes';
import {
  bearingDegrees,
  compassLabel,
  compassPoint,
  distanceToSpotMeters,
  formatBearing,
  formatDistance,
  headingDelta,
} from '../arrival/geoMath';
import { currentMapsUserAgent, mapsPinUrl } from '../arrival/mapsLinks';
import type { GeolocationWatchStatus } from '../hooks/useGeolocationWatch';
import { SpotMapPreview } from './SpotMapPreview';
import styles from './arrival.module.css';

const compassTicks = Array.from({ length: 72 }, (_, index) => index * 5);

interface LocationHeadingViewProps {
  name: string;
  latitude: number;
  longitude: number;
  geoStatus: GeolocationWatchStatus;
  userLatitude: number | null;
  userLongitude: number | null;
  accuracy: number | null;
  heading: number | null;
  compassTracking: boolean;
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
  if (turn == null) return null;
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
  compassTracking,
  onEnableCompass,
}: LocationHeadingViewProps) {
  const keepLabel = compassTracking
    ? heading == null
      ? 'Calibrando…'
      : 'Rumo ativo'
    : 'Manter rumo';
  const pinHref = mapsPinUrl(latitude, longitude, name, currentMapsUserAgent());
  const ready = geoStatus === 'ready' && userLatitude != null && userLongitude != null;
  const bearing = ready ? bearingDegrees(userLatitude, userLongitude, latitude, longitude) : null;
  const meters = ready
    ? distanceToSpotMeters(userLatitude, userLongitude, latitude, longitude)
    : null;
  const distance = meters == null ? null : formatDistance(meters);
  const roseRotation = heading == null ? 0 : -heading;
  const turn = heading != null && bearing != null ? headingDelta(heading, bearing) : null;
  const instruction = headingInstruction(turn);
  const copy = geoCopy(geoStatus);
  const accuracyLabel =
    accuracy != null && Number.isFinite(accuracy)
      ? accuracy >= 50
        ? `Posição aproximada · precisão ${formatDistance(accuracy)}`
        : `Precisão ${formatDistance(accuracy)}`
      : null;

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
              {compassTicks.map((deg) => (
                <span
                  key={deg}
                  className={styles.tick}
                  data-major={deg % 30 === 0}
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <i />
                </span>
              ))}
              <span className={styles.compassPoint} data-cardinal="n">
                N
              </span>
              <span className={styles.compassPoint} data-cardinal="l">
                L
              </span>
              <span className={styles.compassPoint} data-cardinal="s">
                S
              </span>
              <span className={styles.compassPoint} data-cardinal="o">
                O
              </span>
              <span className={styles.compassInter} data-dir="ne">
                NE
              </span>
              <span className={styles.compassInter} data-dir="se">
                SE
              </span>
              <span className={styles.compassInter} data-dir="so">
                SO
              </span>
              <span className={styles.compassInter} data-dir="no">
                NO
              </span>
              <span
                className={styles.needle}
                style={{ transform: `translate(-50%, -100%) rotate(${bearing}deg)` }}
              />
              <span className={styles.hub} />
            </div>
          </div>
          <p className={styles.bearing}>
            {formatBearing(bearing)}
            <span>
              {compassPoint(bearing)}
              {instruction ? ` · ${instruction}` : ''}
            </span>
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
      <div className={styles.metric}>
        <strong>{distance ?? '—'}</strong>
        <span>Distância em linha reta</span>
        {bearing != null ? (
          <span className={styles.metricHint}>
            <Navigation size={14} aria-hidden="true" />
            Rumo {formatBearing(bearing)} {compassLabel(bearing)}
            {accuracyLabel ? ` · ${accuracyLabel}` : ''}
          </span>
        ) : null}
      </div>
      <SpotMapPreview
        latitude={latitude}
        longitude={longitude}
        name={name}
        fromLatitude={userLatitude}
        fromLongitude={userLongitude}
        variant="dark"
      />
      <p className={styles.headingNotice}>
        <AlertTriangle size={16} aria-hidden="true" />
        {headingDisclaimer()}
      </p>
      <div className={styles.actions}>
        <a className={styles.mapButton} href={pinHref} rel="noopener noreferrer" target="_blank">
          <Navigation size={16} aria-hidden="true" /> Abrir no mapa
        </a>
        <button
          type="button"
          className={styles.keepButton}
          aria-pressed={compassTracking}
          onClick={() => void onEnableCompass()}
        >
          {keepLabel}
        </button>
      </div>
    </div>
  );
}
