import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { formatDistanceKm, parseSpotWebcam, parseWebcamSearch } from './webcamMapper';

describe('parseSpotWebcam', () => {
  it('aceita câmera vinculada com embed https', () => {
    expect(
      parseSpotWebcam({
        linked: true,
        provider: 'windy',
        externalId: '123',
        name: 'Campeche',
        latitude: -27.65,
        longitude: -48.46,
        isAvailable: true,
        isLive: true,
        player: { kind: 'embed', embedUrl: 'https://webcams.windy.com/embed/123/live' },
      }),
    ).toMatchObject({
      linked: true,
      name: 'Campeche',
      player: { embedUrl: 'https://webcams.windy.com/embed/123/live' },
    });
  });

  it('não expõe player http ou ausente', () => {
    expect(
      parseSpotWebcam({
        linked: true,
        provider: 'windy',
        externalId: '123',
        name: 'Campeche',
        isAvailable: false,
        isLive: false,
        player: null,
      }).player,
    ).toBeNull();
  });

  it('aceita ausência de vínculo', () => {
    expect(parseSpotWebcam({ linked: false })).toEqual({
      linked: false,
      provider: null,
      providerDisplayName: null,
      externalId: null,
      name: null,
      latitude: null,
      longitude: null,
      isAvailable: false,
      isLive: false,
      player: null,
    });
  });
});

describe('parseWebcamSearch', () => {
  it('mapeia resultados utilizáveis', () => {
    expect(
      parseWebcamSearch({
        items: [
          {
            provider: 'windy',
            externalId: '111',
            name: 'Campeche',
            latitude: -27.65,
            longitude: -48.46,
            distanceKm: 1.2,
            isLive: true,
            hasPlayer: true,
            previewUrl: 'https://images.windy.com/preview.jpg',
          },
        ],
      }),
    ).toEqual([
      {
        provider: 'windy',
        providerDisplayName: null,
        externalId: '111',
        name: 'Campeche',
        latitude: -27.65,
        longitude: -48.46,
        distanceKm: 1.2,
        isLive: true,
        hasPlayer: true,
        previewUrl: 'https://images.windy.com/preview.jpg',
      },
    ]);
  });

  it('rejeita lista inválida', () => {
    expect(() => parseWebcamSearch([])).toThrow(ContractError);
  });
});

describe('formatDistanceKm', () => {
  it('formata em português', () => {
    expect(formatDistanceKm(1.2)).toBe('1,2 km');
  });
});
