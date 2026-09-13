import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeviceHeading } from './useDeviceHeading';

type OrientationListener = (event: Event) => void;

describe('useDeviceHeading', () => {
  const listeners = new Map<string, Set<OrientationListener>>();
  const originalOrientation = window.DeviceOrientationEvent;
  const originalAdd = window.addEventListener.bind(window);
  const originalRemove = window.removeEventListener.bind(window);

  beforeEach(() => {
    listeners.clear();
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (
        type === 'deviceorientation' ||
        type === 'deviceorientationabsolute' ||
        type === 'visibilitychange'
      ) {
        const bucket = listeners.get(type) ?? new Set();
        bucket.add(listener as OrientationListener);
        listeners.set(type, bucket);
        return;
      }
      originalAdd(type, listener, options);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (
        type === 'deviceorientation' ||
        type === 'deviceorientationabsolute' ||
        type === 'visibilitychange'
      ) {
        listeners.get(type)?.delete(listener as OrientationListener);
        return;
      }
      originalRemove(type, listener, options);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      configurable: true,
      writable: true,
      value: originalOrientation,
    });
  });

  function dispatch(type: string, init: Record<string, unknown>) {
    const event = new Event(type);
    Object.assign(event, init);
    listeners.get(type)?.forEach((listener) => listener(event));
  }

  it('lê o rumo absoluto no Android', async () => {
    const { result } = renderHook(() => useDeviceHeading());

    expect(result.current.tracking).toBe(true);

    act(() => {
      dispatch('deviceorientationabsolute', { alpha: 90, absolute: true });
    });

    await waitFor(() => expect(result.current.heading).toBe(270));
  });

  it('ignora orientação relativa depois de receber rumo absoluto', async () => {
    const { result } = renderHook(() => useDeviceHeading());

    act(() => {
      dispatch('deviceorientationabsolute', { alpha: 0, absolute: true });
    });
    await waitFor(() => expect(result.current.heading).toBe(0));

    act(() => {
      dispatch('deviceorientation', { alpha: 90, absolute: false });
    });

    expect(result.current.heading).toBe(0);
  });

  it('só liga a bússola depois da permissão no iOS', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const);
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      configurable: true,
      writable: true,
      value: Object.assign(class DeviceOrientationEvent {}, { requestPermission }),
    });

    const { result } = renderHook(() => useDeviceHeading());
    expect(result.current.tracking).toBe(false);
    expect(result.current.needsPermission).toBe(true);

    await act(async () => {
      await result.current.enableCompass();
    });

    expect(requestPermission).toHaveBeenCalled();
    expect(result.current.tracking).toBe(true);
    expect(result.current.needsPermission).toBe(false);
  });
});
