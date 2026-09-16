import { describe, expect, it } from 'vitest';
import {
  appleMapsDirectionsUrl,
  directionsUrl,
  googleMapsDirectionsUrl,
  mapsPinUrl,
  prefersAppleMaps,
} from './mapsLinks';

describe('mapsLinks', () => {
  it('monta rota de carro no Google Maps', () => {
    expect(googleMapsDirectionsUrl(-27.65407, -48.46908, 'driving')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-27.65407%2C-48.46908&travelmode=driving',
    );
  });

  it('monta rota a pé no Apple Mapas', () => {
    expect(appleMapsDirectionsUrl(-27.65407, -48.46908, 'Campeche', 'walking')).toBe(
      'https://maps.apple.com/?daddr=-27.65407%2C-48.46908&q=Campeche&dirflg=w',
    );
  });

  it('escolhe Apple Mapas no iPhone e Google no restante', () => {
    expect(prefersAppleMaps('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(
      directionsUrl({
        latitude: -27.6,
        longitude: -48.5,
        name: 'Campeche',
        travelMode: 'driving',
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      }),
    ).toContain('google.com/maps/dir');
    expect(
      directionsUrl({
        latitude: -27.6,
        longitude: -48.5,
        name: 'Campeche',
        travelMode: 'driving',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      }),
    ).toContain('maps.apple.com');
  });

  it('abre o ponto no mapa, sem rota', () => {
    expect(mapsPinUrl(-27.65407, -48.46908, 'Campeche')).toBe(
      'https://www.google.com/maps/search/?api=1&query=-27.65407%2C-48.46908',
    );
    expect(
      mapsPinUrl(
        -27.65407,
        -48.46908,
        'Campeche',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      ),
    ).toContain('maps.apple.com');
  });
});
