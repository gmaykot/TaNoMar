export type LocationStampKind = 'owner' | 'shared' | 'favorite';

export function locationStampKind(spot: {
  isOwner: boolean;
  visibility?: string;
}): LocationStampKind | null {
  if (spot.isOwner) return 'owner';
  if (spot.visibility === 'shared') return 'shared';
  return null;
}

export function locationStampKinds(spot: {
  isOwner: boolean;
  visibility?: string;
  isFavorite?: boolean;
}): LocationStampKind[] {
  const kinds: LocationStampKind[] = [];
  const ownership = locationStampKind(spot);
  if (ownership) kinds.push(ownership);
  if (spot.isFavorite) kinds.push('favorite');
  return kinds;
}
