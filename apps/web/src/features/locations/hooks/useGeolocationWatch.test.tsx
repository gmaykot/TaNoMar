import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeolocationWatch } from './useGeolocationWatch';

const watchPosition = vi.fn();
const clearWatch = vi.fn();

describe('useGeolocationWatch', () => {
  beforeEach(() => {
    watchPosition.mockReset();
    clearWatch.mockReset();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
  });

  it('guarda latitude e longitude quando o GPS responde', async () => {
    watchPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: {
          latitude: -27.6,
          longitude: -48.5,
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON() {
            return this;
          },
        },
        timestamp: 1,
        toJSON() {
          return this;
        },
      } as GeolocationPosition);
      return 9;
    });

    const { result, unmount } = renderHook(() => useGeolocationWatch(true));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({
      latitude: -27.6,
      longitude: -48.5,
      accuracy: 12,
    });
    unmount();
    expect(clearWatch).toHaveBeenCalledWith(9);
  });

  it('marca permissão negada', async () => {
    watchPosition.mockImplementation((_success: PositionCallback, error: PositionErrorCallback) => {
      error({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'denied',
      } as GeolocationPositionError);
      return 3;
    });

    const { result } = renderHook(() => useGeolocationWatch(true));
    await waitFor(() => expect(result.current.status).toBe('denied'));
  });
});
