import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ForecastRankingEmphasis } from '@/features/fishing/types/fishing';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { getForecast, getLocationForecast } from '../services/forecastService';
import { enrichForecastOwnership } from '../utils/enrichForecastOwnership';

const staleTime = 5 * 60 * 1000;

export const forecastQueryKey = ['forecast'] as const;

export function useForecast(emphasis?: ForecastRankingEmphasis) {
  const locations = useLocations();
  const query = useQuery({
    queryKey: emphasis ? ['forecast', emphasis] : forecastQueryKey,
    queryFn: () => getForecast(emphasis),
    staleTime,
    placeholderData: keepPreviousData,
  });

  const data = useMemo(() => {
    if (!query.data) return undefined;
    if (!locations.data) return query.data;
    return enrichForecastOwnership(query.data, locations.data);
  }, [locations.data, query.data]);

  return { ...query, data };
}

export function useLocationForecast(locationId: string) {
  return useQuery({
    queryKey: ['location-forecast', locationId],
    queryFn: () => getLocationForecast(locationId),
    staleTime,
    enabled: locationId.length > 0,
  });
}
