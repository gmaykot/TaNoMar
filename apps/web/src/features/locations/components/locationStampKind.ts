export type LocationStampKind = 'owner' | 'shared';

export function locationStampKind(spot: {
  isOwner: boolean;
  visibility?: string;
}): LocationStampKind | null {
  if (spot.isOwner) return 'owner';
  if (spot.visibility === 'shared') return 'shared';
  return null;
}
