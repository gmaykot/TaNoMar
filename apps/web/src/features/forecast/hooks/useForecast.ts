import { useQuery } from '@tanstack/react-query';
import { getForecast, getLocationForecast } from '../services/forecastService';

const staleTime = 5 * 60 * 1000;

export const forecastQueryKey = ['forecast'] as const;

export function useForecast() {
  return useQuery({ queryKey: forecastQueryKey, queryFn: getForecast, staleTime });
}

export function useLocationForecast(locationId: string) {
  return useQuery({
    queryKey: ['location-forecast', locationId],
    queryFn: () => getLocationForecast(locationId),
    staleTime,
    enabled: locationId.length > 0,
  });
}
