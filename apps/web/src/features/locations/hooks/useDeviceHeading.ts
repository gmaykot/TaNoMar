import { useCallback, useEffect, useRef, useState } from 'react';

interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type OrientationPermission = {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

function orientationCtor() {
  if (typeof window === 'undefined') return undefined;
  return window.DeviceOrientationEvent as
    (typeof DeviceOrientationEvent & OrientationPermission) | undefined;
}

function canUseOrientation() {
  return Boolean(orientationCtor());
}

function needsOrientationPermission() {
  return typeof orientationCtor()?.requestPermission === 'function';
}

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}

function headingFromEvent(event: WebkitDeviceOrientationEvent) {
  if (typeof event.webkitCompassHeading === 'number') {
    return normalizeHeading(event.webkitCompassHeading);
  }
  if (event.alpha == null) return null;
  return normalizeHeading(360 - event.alpha);
}

function isAbsoluteOrientation(event: WebkitDeviceOrientationEvent) {
  return (
    event.type === 'deviceorientationabsolute' ||
    event.absolute === true ||
    typeof event.webkitCompassHeading === 'number'
  );
}

async function requestScreenWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return null;
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}

export function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(needsOrientationPermission);
  const [tracking, setTracking] = useState(
    () => canUseOrientation() && !needsOrientationPermission(),
  );
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!tracking) return;

    let gotAbsolute = false;

    function onOrientation(event: Event) {
      const orientation = event as WebkitDeviceOrientationEvent;
      const absolute = isAbsoluteOrientation(orientation);
      if (gotAbsolute && !absolute) return;
      if (absolute) gotAbsolute = true;
      const next = headingFromEvent(orientation);
      if (next == null) return;
      setHeading(next);
    }

    window.addEventListener('deviceorientationabsolute', onOrientation, true);
    window.addEventListener('deviceorientation', onOrientation, true);

    let cancelled = false;

    async function lockScreen() {
      const sentinel = await requestScreenWakeLock();
      if (cancelled) {
        await sentinel?.release();
        return;
      }
      await wakeLockRef.current?.release();
      wakeLockRef.current = sentinel;
    }

    void lockScreen();

    function onVisibility() {
      if (document.visibilityState === 'visible') void lockScreen();
    }

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('deviceorientationabsolute', onOrientation, true);
      window.removeEventListener('deviceorientation', onOrientation, true);
      document.removeEventListener('visibilitychange', onVisibility);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [tracking]);

  const enableCompass = useCallback(async () => {
    const ctor = orientationCtor();
    if (ctor?.requestPermission) {
      const result = await ctor.requestPermission();
      if (result !== 'granted') return;
      setNeedsPermission(false);
    }
    setTracking(canUseOrientation());
  }, []);

  return { heading, tracking, needsPermission, enableCompass };
}
