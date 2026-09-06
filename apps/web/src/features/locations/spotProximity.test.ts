import { describe, expect, it } from 'vitest';
import { locationsFixture } from './fixtures/locations';
import {
  distanceMeters,
  duplicateSpotMeters,
  findSimilarLocation,
  isSamePlace,
} from './spotProximity';

const campeche = locationsFixture[0]!;

describe('findSimilarLocation', () => {
  it('detecta local a menos de 200 m', () => {
    const match = findSimilarLocation(locationsFixture, {
      name: 'Outro nome',
      latitude: campeche.latitude + 0.0005,
      longitude: campeche.longitude,
    });
    expect(match?.reason).toBe('proximity');
    expect(match?.location.id).toBe('campeche');
    expect(match?.meters).toBeLessThanOrEqual(duplicateSpotMeters);
  });

  it('detecta o mesmo nome ignorando acento e maiúscula', () => {
    const match = findSimilarLocation(locationsFixture, {
      name: 'CAMPECHE',
      latitude: -27.1,
      longitude: -48.1,
    });
    expect(match).toMatchObject({ reason: 'name', location: { id: 'campeche' } });
  });

  it('ignora o próprio local na edição', () => {
    expect(
      findSimilarLocation(locationsFixture, {
        name: campeche.name,
        latitude: campeche.latitude,
        longitude: campeche.longitude,
        excludeId: campeche.id,
      }),
    ).toBeNull();
  });

  it('prefere proximidade quando nome e coordenada batem em locais diferentes', () => {
    const other = locationsFixture[1]!;
    const match = findSimilarLocation(locationsFixture, {
      name: other.name,
      latitude: campeche.latitude,
      longitude: campeche.longitude,
    });
    expect(match?.location.id).toBe('campeche');
    expect(match?.reason).toBe('proximity');
  });
});

describe('isSamePlace', () => {
  it('considera próximos pela distância', () => {
    expect(
      isSamePlace(
        { name: 'A', latitude: campeche.latitude, longitude: campeche.longitude },
        {
          name: 'B',
          latitude: campeche.latitude,
          longitude: campeche.longitude + 0.0004,
        },
      ),
    ).toBe(true);
    expect(
      distanceMeters(
        campeche.latitude,
        campeche.longitude,
        campeche.latitude,
        campeche.longitude + 0.01,
      ),
    ).toBeGreaterThan(duplicateSpotMeters);
  });
});
