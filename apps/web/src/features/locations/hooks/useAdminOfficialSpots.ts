import { useQuery } from '@tanstack/react-query';
import { getAdminOfficialLocations } from '../services/locationsService';

export const adminOfficialSpotsQueryKey = ['admin-official-spots'] as const;

export function useAdminOfficialSpots() {
  return useQuery({
    queryKey: adminOfficialSpotsQueryKey,
    queryFn: getAdminOfficialLocations,
  });
}
