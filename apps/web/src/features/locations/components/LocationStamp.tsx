import { Heart, Star, Users } from 'lucide-react';
import { locationStampKinds, type LocationStampKind } from './locationStampKind';
import styles from './locations.module.css';

const stampCopy: Record<LocationStampKind, { icon: typeof Star; label: string }> = {
  owner: { icon: Star, label: 'Meu local' },
  shared: { icon: Users, label: 'Compartilhado' },
  favorite: { icon: Heart, label: 'Favorito' },
};

const stampModifier: Partial<Record<LocationStampKind, string>> = {
  shared: styles.sharedStamp,
  favorite: styles.favoriteStamp,
};

interface LocationStampProps {
  kind: LocationStampKind;
}

export function LocationStamp({ kind }: LocationStampProps) {
  const { icon: Icon, label } = stampCopy[kind];
  const modifier = stampModifier[kind];
  return (
    <span
      data-location-stamp={kind}
      className={modifier ? `${styles.locationStamp} ${modifier}` : styles.locationStamp}
    >
      <Icon
        size={11}
        fill={kind === 'owner' || kind === 'favorite' ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function LocationStampFor(spot: {
  isOwner: boolean;
  visibility?: string;
  isFavorite?: boolean;
}) {
  const kinds = locationStampKinds(spot);
  if (kinds.length === 0) return null;
  return (
    <span className={styles.locationStamps} data-location-stamps={kinds.join(' ')}>
      {kinds.map((kind) => (
        <LocationStamp key={kind} kind={kind} />
      ))}
    </span>
  );
}
