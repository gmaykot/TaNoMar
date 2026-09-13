import { useCallback, useEffect, useState } from 'react';

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

function headingFromEvent(event: WebkitDeviceOrientationEvent) {
  if (typeof event.webkitCompassHeading === 'number') return event.webkitCompassHeading;
  if (event.alpha == null) return null;
  return (360 - event.alpha) % 360;
}

export function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(
    () => typeof orientationCtor()?.requestPermission === 'function',
  );
  const [granted, setGranted] = useState(
    () => Boolean(orientationCtor()) && typeof orientationCtor()?.requestPermission !== 'function',
  );

  useEffect(() => {
    if (!granted) return;

    function onOrientation(event: DeviceOrientationEvent) {
      const next = headingFromEvent(event);
      if (next == null) return;
      setHeading(next);
    }

    window.addEventListener('deviceorientation', onOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation, true);
    };
  }, [granted]);

  const enableCompass = useCallback(async () => {
    const ctor = orientationCtor();
    if (!ctor?.requestPermission) {
      setNeedsPermission(false);
      setGranted(Boolean(ctor));
      return;
    }
    const result = await ctor.requestPermission();
    if (result !== 'granted') return;
    setNeedsPermission(false);
    setGranted(true);
  }, []);

  return { heading, needsPermission, enableCompass };
}
