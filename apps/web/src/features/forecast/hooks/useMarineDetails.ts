import { useQuery } from '@tanstack/react-query';
import { getMarineDetails } from '../services/forecastService';

const staleTime = 5 * 60 * 1000;

export function useMarineDetails(locationId: string, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['marine-details', locationId, date],
    queryFn: () => getMarineDetails(locationId, date),
    staleTime,
    enabled: enabled && locationId.length > 0 && date.length > 0,
  });
}
