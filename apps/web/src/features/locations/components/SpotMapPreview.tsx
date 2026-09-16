import { osmMosaic, osmMosaicPoint } from '../arrival/osmTiles';
import styles from './arrival.module.css';

interface SpotMapPreviewProps {
  latitude: number;
  longitude: number;
  name: string;
  fromLatitude?: number | null;
  fromLongitude?: number | null;
  variant?: 'light' | 'dark';
}

export function SpotMapPreview({
  latitude,
  longitude,
  name,
  fromLatitude = null,
  fromLongitude = null,
  variant = 'light',
}: SpotMapPreviewProps) {
  const mosaic = osmMosaic(latitude, longitude);
  const origin =
    fromLatitude != null && fromLongitude != null
      ? osmMosaicPoint(fromLatitude, fromLongitude, latitude, longitude)
      : null;
  const line =
    origin && origin.left >= 0 && origin.left <= 100 && origin.top >= 0 && origin.top <= 100
      ? { x1: origin.left, y1: origin.top, x2: mosaic.point.left, y2: mosaic.point.top }
      : null;

  return (
    <figure className={`${styles.mapPreview} ${variant === 'dark' ? styles.mapPreviewDark : ''}`}>
      <div className={styles.mapViewport} role="img" aria-label={`Mapa de ${name}`}>
        <div className={styles.mapTiles} aria-hidden="true">
          {mosaic.tiles.map((tile) => (
            <img
              key={tile.key}
              alt=""
              src={tile.src}
              style={{ gridColumn: tile.column + 1, gridRow: tile.row + 1 }}
            />
          ))}
        </div>
        {line ? (
          <svg
            className={styles.mapLine}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
            <circle className={styles.mapYou} cx={line.x1} cy={line.y1} r="2.2" />
          </svg>
        ) : null}
        <span
          className={styles.mapPin}
          style={{ left: `${mosaic.point.left}%`, top: `${mosaic.point.top}%` }}
          aria-hidden="true"
        />
      </div>
      <figcaption className={styles.mapCredit}>© OpenStreetMap</figcaption>
    </figure>
  );
}
