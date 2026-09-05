import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ForecastRankingEmphasis } from '@/features/fishing/types/fishing';
import { getForecast, getLocationForecast } from '../services/forecastService';

const staleTime = 5 * 60 * 1000;

export const forecastQueryKey = ['forecast'] as const;

export function useForecast(emphasis?: ForecastRankingEmphasis) {
  return useQuery({
    queryKey: emphasis ? ['forecast', emphasis] : forecastQueryKey,
    queryFn: () => getForecast(emphasis),
    staleTime,
    placeholderData: keepPreviousData,
  });
}

export function useLocationForecast(locationId: string) {
  return useQuery({
    queryKey: ['location-forecast', locationId],
    queryFn: () => getLocationForecast(locationId),
    staleTime,
    enabled: locationId.length > 0,
  });
}
