import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { minPlaceQueryLength, searchPlaces } from '../services/placesService';

const debounceMs = 300;

export function usePlaceSearch(query: string) {
  const trimmed = query.trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(trimmed), debounceMs);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  const enabled = debounced.length >= minPlaceQueryLength;
  const result = useQuery({
    queryKey: ['places', 'autocomplete', debounced],
    queryFn: () => searchPlaces(debounced),
    enabled,
    staleTime: 60_000,
  });

  return {
    items: result.data ?? [],
    isFetching: enabled && result.isFetching,
    error: result.isError,
  };
}
