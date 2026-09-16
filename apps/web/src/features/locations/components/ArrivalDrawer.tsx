import { AlertTriangle, Car, Footprints, Sailboat } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import drawerStyles from '@/design-system/components/confirmDrawer.module.css';
import {
  arrivalAccessHint,
  arrivalModeDescription,
  arrivalModeTitle,
  boatDisclaimer,
  type ArrivalMode,
} from '../arrival/arrivalModes';
import { currentMapsUserAgent, directionsUrl } from '../arrival/mapsLinks';
import { routes } from '@/shared/constants/routes';
import { SpotMapPreview } from './SpotMapPreview';
import styles from './arrival.module.css';

const modeIcon = {
  driving: Car,
  walking: Footprints,
  boat: Sailboat,
};

interface ArrivalDrawerProps {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  accessType?: string | null;
  modes: ArrivalMode[];
  onClose: () => void;
}

export function ArrivalDrawer({
  locationId,
  name,
  latitude,
  longitude,
  accessType,
  modes,
  onClose,
}: ArrivalDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const userAgent = currentMapsUserAgent();
  const showBoatNotice = modes.includes('boat');

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return createPortal(
    <div className={drawerStyles.root}>
      <button
        type="button"
        className={drawerStyles.backdrop}
        onClick={onClose}
        aria-label="Fechar como chegar"
      />
      <div
        ref={panelRef}
        className={`${drawerStyles.drawer} ${styles.arrivalPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className={drawerStyles.handle} aria-hidden="true" />
        <span className={drawerStyles.meta}>Como chegar</span>
        <h2 id={titleId}>{name}</h2>
        <p id={descriptionId}>{arrivalAccessHint(accessType)}</p>
        <SpotMapPreview latitude={latitude} longitude={longitude} name={name} />
        <div className={styles.modeList}>
          {modes.map((mode) => {
            const Icon = modeIcon[mode];
            const title = arrivalModeTitle(mode, accessType);
            const description = arrivalModeDescription(mode);
            const content = (
              <>
                <span className={styles.modeIcon}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </span>
              </>
            );
            if (mode === 'boat') {
              return (
                <Link
                  key={mode}
                  className={styles.mode}
                  data-kind="boat"
                  to={routes.locationHeading(locationId)}
                >
                  {content}
                </Link>
              );
            }
            return (
              <a
                key={mode}
                className={styles.mode}
                data-kind={mode}
                href={directionsUrl({
                  latitude,
                  longitude,
                  name,
                  travelMode: mode,
                  userAgent,
                })}
                rel="noopener noreferrer"
                target="_blank"
              >
                {content}
              </a>
            );
          })}
        </div>
        {showBoatNotice ? (
          <p className={styles.notice}>
            <AlertTriangle size={16} aria-hidden="true" />
            {boatDisclaimer()}
          </p>
        ) : null}
        <Button type="button" variant="quiet" className={styles.cancel} onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>,
    document.body,
  );
}
