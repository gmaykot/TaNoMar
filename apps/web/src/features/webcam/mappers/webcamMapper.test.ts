import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import {
  formatDistanceKm,
  parseSpotWebcam,
  parseWebcamSearch,
  webcamAutoplayUrl,
  webcamPreviewUrl,
  webcamSearchCaption,
} from './webcamMapper';

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
        previewUrl: 'https://images.windy.com/preview.jpg',
        player: { kind: 'embed', embedUrl: 'https://webcams.windy.com/embed/123/live' },
      }),
    ).toMatchObject({
      linked: true,
      name: 'Campeche',
      previewUrl: 'https://images.windy.com/preview.jpg',
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
      previewUrl: null,
      player: null,
    });
  });
});

describe('webcamPreviewUrl', () => {
  it('usa a miniatura do contrato e cai no YouTube quando faltar', () => {
    expect(
      webcamPreviewUrl({
        previewUrl: 'https://images.windy.com/preview.jpg',
        provider: 'windy',
        externalId: '123',
      }),
    ).toBe('https://images.windy.com/preview.jpg');
    expect(
      webcamPreviewUrl({
        previewUrl: null,
        provider: 'youtube',
        externalId: 'dQw4w9WgXcQ',
      }),
    ).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});

describe('webcamAutoplayUrl', () => {
  it('pede autoplay mudo no embed', () => {
    expect(webcamAutoplayUrl('https://webcams.windy.com/embed/123/live')).toBe(
      'https://webcams.windy.com/embed/123/live?autoplay=1&mute=1&playsinline=1',
    );
    expect(webcamAutoplayUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toContain('autoplay=1');
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

describe('webcamSearchCaption', () => {
  it('mostra YouTube em vez da distância', () => {
    expect(
      webcamSearchCaption({
        provider: 'youtube',
        providerDisplayName: 'YouTube',
        externalId: 'dQw4w9WgXcQ',
        name: 'Campeche ao vivo',
        latitude: -27.65,
        longitude: -48.46,
        distanceKm: 0,
        isLive: true,
        hasPlayer: true,
        previewUrl: null,
      }),
    ).toBe('YouTube');
  });
});
