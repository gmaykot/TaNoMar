import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { hasSpotCoordinates } from '@/features/locations/arrival/geoMath';
import { LocationHeadingView } from '@/features/locations/components/LocationHeadingView';
import headingStyles from '@/features/locations/components/arrival.module.css';
import { useDeviceHeading } from '@/features/locations/hooks/useDeviceHeading';
import { useGeolocationWatch } from '@/features/locations/hooks/useGeolocationWatch';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function LocationHeadingPage() {
  const { locationId = '' } = useParams();
  const locations = useLocations();
  const location = locations.data?.find((item) => item.id === locationId);
  const geo = useGeolocationWatch(Boolean(location && hasSpotCoordinates(location)));
  const compass = useDeviceHeading();

  if (locations.isPending) {
    return <FeedbackState title="Abrindo o rumo" description="Carregando este local." busy />;
  }
  if (locations.isError) {
    return (
      <FeedbackState
        title="Rumo indisponível"
        description="Não foi possível abrir este local."
        action={
          <Link className={styles.backLink} to={routes.locations}>
            Voltar aos locais
          </Link>
        }
      />
    );
  }
  if (!location) {
    return (
      <FeedbackState
        title="Local não encontrado"
        description="Esse ponto ainda não faz parte do mapa TáNoMar."
        action={
          <Link className={styles.backLink} to={routes.locations}>
            Voltar aos locais
          </Link>
        }
      />
    );
  }
  if (!hasSpotCoordinates(location)) {
    return (
      <div className={styles.page}>
        <Link className={styles.backLink} to={routes.locationDetails(location.id)}>
          <ArrowLeft size={18} aria-hidden="true" /> Voltar ao local
        </Link>
        <FeedbackState
          title="Sem coordenadas"
          description="Este local ainda não tem posição para rumo ou mapa."
        />
      </div>
    );
  }

  return (
    <div className={headingStyles.headingScreen}>
      <div className={headingStyles.headingTop}>
        <Link className={headingStyles.headingBack} to={routes.locationDetails(location.id)}>
          <ArrowLeft size={18} aria-hidden="true" /> Voltar
        </Link>
        <div className={headingStyles.headingCopy}>
          <h1>Rumo ao local</h1>
          <span>{location.name}</span>
        </div>
      </div>
      <LocationHeadingView
        name={location.name}
        latitude={location.latitude}
        longitude={location.longitude}
        geoStatus={geo.status}
        userLatitude={geo.latitude}
        userLongitude={geo.longitude}
        accuracy={geo.accuracy}
        heading={compass.heading}
        compassTracking={compass.tracking}
        onToggleCompass={() => void compass.toggleCompass()}
      />
    </div>
  );
}
