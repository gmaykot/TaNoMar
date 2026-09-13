import { useEffect, useState } from 'react';

export type GeolocationWatchStatus = 'locating' | 'ready' | 'denied' | 'error' | 'unsupported';

export interface GeolocationWatchState {
  status: GeolocationWatchStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

const empty: GeolocationWatchState = {
  status: 'locating',
  latitude: null,
  longitude: null,
  accuracy: null,
};

export function useGeolocationWatch(enabled: boolean): GeolocationWatchState {
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [fix, setFix] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [failure, setFailure] = useState<'denied' | 'error' | null>(null);

  useEffect(() => {
    if (!enabled || !supported) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setFailure(null);
        setFix({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        setFix(null);
        setFailure(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, supported]);

  if (!enabled) return empty;
  if (!supported) {
    return { status: 'unsupported', latitude: null, longitude: null, accuracy: null };
  }
  if (failure) {
    return { status: failure, latitude: null, longitude: null, accuracy: null };
  }
  if (fix) {
    return { status: 'ready', ...fix };
  }
  return empty;
}
