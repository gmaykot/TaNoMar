import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readForecastDate, writeForecastDate } from '../forecastDate';

export function useForecastDateParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = readForecastDate(searchParams);
  const setForecastDate = useCallback(
    (date: string) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          writeForecastDate(params, date);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  return { requestedDate, setForecastDate };
}
