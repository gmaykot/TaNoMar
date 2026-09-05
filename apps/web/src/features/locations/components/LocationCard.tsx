import { ArrowUpRight, Heart, MapPin, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { IconButton } from '@/design-system/components/IconButton';
import type { FishingLocation } from '@/features/fishing/types/fishing';
import styles from './locations.module.css';

const profileLabel = {
  praia_aberta: 'Praia aberta',
  praia_semi_aberta: 'Praia semiaberta',
  praia_protegida: 'Águas protegidas',
};

function visibilityLabel(location: FishingLocation) {
  if (location.visibility === 'private') return 'Privado';
  if (location.visibility === 'shared' && !location.isApproved) return 'Pendente';
  if (location.visibility === 'shared') return 'Comunidade';
  return profileLabel[location.profile];
}

interface LocationCardProps {
  location: FishingLocation;
  onToggleFavorite?: () => void;
}

export function LocationCard({ location, onToggleFavorite }: LocationCardProps) {
  return (
    <Card as="article" className={styles.card}>
      <div className={styles.icon} aria-hidden="true">
        <Waves size={24} />
      </div>
      <div className={styles.content}>
        <span>{visibilityLabel(location)}</span>
        <h2>{location.name}</h2>
        <p>
          <MapPin size={15} aria-hidden="true" /> {location.region}, {location.city}
        </p>
      </div>
      {onToggleFavorite ? (
        <IconButton
          label={location.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
          onClick={onToggleFavorite}
          className={location.isFavorite ? styles.favoriteOn : styles.favorite}
        >
          <Heart
            size={18}
            fill={location.isFavorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </IconButton>
      ) : null}
      <Link to={`/locais/${location.id}`} aria-label={`Ver previsão de ${location.name}`}>
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  );
}
