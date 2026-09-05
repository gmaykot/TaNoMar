import { useQuery } from '@tanstack/react-query';
import { getLocations } from '../services/locationsService';
import { locationsQueryKey } from './useLocationMutations';

export function useLocations() {
  return useQuery({
    queryKey: locationsQueryKey,
    queryFn: getLocations,
    staleTime: 5 * 60 * 1000,
  });
}
