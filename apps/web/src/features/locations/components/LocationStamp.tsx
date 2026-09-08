import { Star, Users } from 'lucide-react';
import { locationStampKind, type LocationStampKind } from './locationStampKind';
import styles from './locations.module.css';

const stampCopy: Record<LocationStampKind, { icon: typeof Star; label: string }> = {
  owner: { icon: Star, label: 'Meu local' },
  shared: { icon: Users, label: 'Compartilhado' },
};

interface LocationStampProps {
  kind: LocationStampKind;
}

export function LocationStamp({ kind }: LocationStampProps) {
  const { icon: Icon, label } = stampCopy[kind];
  return (
    <span
      data-location-stamp={kind}
      className={`${styles.locationStamp} ${kind === 'shared' ? styles.sharedStamp : ''}`}
    >
      <Icon size={11} fill={kind === 'owner' ? 'currentColor' : 'none'} aria-hidden="true" />
      {label}
    </span>
  );
}

export function LocationStampFor(spot: { isOwner: boolean; visibility?: string }) {
  const kind = locationStampKind(spot);
  return kind ? <LocationStamp kind={kind} /> : null;
}
