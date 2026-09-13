export type RoadTravelMode = 'driving' | 'walking';

export function prefersAppleMaps(userAgent: string) {
  return /iPhone|iPad|iPod/.test(userAgent);
}

function destination(latitude: number, longitude: number) {
  return `${latitude},${longitude}`;
}

export function googleMapsDirectionsUrl(
  latitude: number,
  longitude: number,
  travelMode: RoadTravelMode,
) {
  const params = new URLSearchParams({
    api: '1',
    destination: destination(latitude, longitude),
    travelmode: travelMode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsDirectionsUrl(
  latitude: number,
  longitude: number,
  name: string,
  travelMode: RoadTravelMode,
) {
  const params = new URLSearchParams({
    daddr: destination(latitude, longitude),
    q: name,
    dirflg: travelMode === 'walking' ? 'w' : 'd',
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

export function mapsPinUrl(latitude: number, longitude: number, name: string, userAgent = '') {
  if (prefersAppleMaps(userAgent)) {
    const params = new URLSearchParams({
      ll: destination(latitude, longitude),
      q: name,
    });
    return `https://maps.apple.com/?${params.toString()}`;
  }
  const params = new URLSearchParams({
    api: '1',
    query: destination(latitude, longitude),
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function directionsUrl(input: {
  latitude: number;
  longitude: number;
  name: string;
  travelMode: RoadTravelMode;
  userAgent?: string;
}) {
  const userAgent =
    input.userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
  if (prefersAppleMaps(userAgent)) {
    return appleMapsDirectionsUrl(input.latitude, input.longitude, input.name, input.travelMode);
  }
  return googleMapsDirectionsUrl(input.latitude, input.longitude, input.travelMode);
}

export function currentMapsUserAgent() {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}
