import {
  Anchor,
  ArrowUpRight,
  Eye,
  EyeOff,
  Heart,
  Lock,
  MapPin,
  Sailboat,
  Star,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { IconButton } from '@/design-system/components/IconButton';
import type { FishingLocation } from '@/features/fishing/types/fishing';
import styles from './locations.module.css';

const profileVisual = {
  praia_aberta: { label: 'Praia aberta', icon: Waves, className: styles.iconAberta },
  praia_semi_aberta: { label: 'Praia semiaberta', icon: Sailboat, className: styles.iconSemi },
  praia_protegida: { label: 'Águas protegidas', icon: Anchor, className: styles.iconProtegida },
};

function visibilityLabel(location: FishingLocation) {
  if (location.visibility === 'private') return 'Privado';
  if (location.visibility === 'shared' && !location.isApproved) return 'Pendente';
  if (location.visibility === 'shared') return 'Comunidade';
  return profileVisual[location.profile].label;
}

interface LocationCardProps {
  location: FishingLocation;
  onToggleFavorite?: () => void;
  onToggleEnabled?: () => void;
  favoriteLocked?: boolean;
}

export function LocationCard({
  location,
  onToggleFavorite,
  onToggleEnabled,
  favoriteLocked = false,
}: LocationCardProps) {
  const profile = profileVisual[location.profile];
  const ProfileIcon = profile.icon;
  return (
    <Card as="article" className={styles.card}>
      <div className={`${styles.icon} ${profile.className}`} role="img" aria-label={profile.label}>
        <ProfileIcon size={24} aria-hidden="true" />
      </div>
      <div className={styles.content}>
        <span>{visibilityLabel(location)}</span>
        <h2>{location.name}</h2>
        <p>
          <MapPin size={15} aria-hidden="true" /> {location.region}, {location.city}
        </p>
      </div>
      {location.isOwner ? (
        <span className={styles.ownerBadge}>
          <Star size={11} fill="currentColor" aria-hidden="true" />
          Meu local
        </span>
      ) : null}
      {onToggleEnabled || onToggleFavorite ? (
        <div className={styles.actions}>
          {onToggleEnabled ? (
            <IconButton
              label={location.isEnabled ? 'Remover das previsões' : 'Incluir nas previsões'}
              aria-pressed={location.isEnabled}
              onClick={onToggleEnabled}
              className={location.isEnabled ? styles.enabledOn : styles.enabled}
            >
              {location.isEnabled ? (
                <Eye size={18} aria-hidden="true" />
              ) : (
                <EyeOff size={18} aria-hidden="true" />
              )}
            </IconButton>
          ) : null}
          {onToggleFavorite ? (
            <IconButton
              label={
                favoriteLocked && !location.isFavorite
                  ? 'Favoritar bloqueado no plano atual'
                  : location.isFavorite
                    ? 'Remover dos favoritos'
                    : 'Favoritar'
              }
              locked={favoriteLocked && !location.isFavorite}
              onClick={onToggleFavorite}
              className={
                favoriteLocked && !location.isFavorite
                  ? styles.favorite
                  : location.isFavorite
                    ? styles.favoriteOn
                    : styles.favorite
              }
            >
              {favoriteLocked && !location.isFavorite ? (
                <Lock size={18} aria-hidden="true" />
              ) : (
                <Heart
                  size={18}
                  fill={location.isFavorite ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
              )}
            </IconButton>
          ) : null}
        </div>
      ) : null}
      <Link
        className={styles.hit}
        to={`/locais/${location.id}`}
        aria-label={`Ver previsão de ${location.name}`}
      >
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  );
}
