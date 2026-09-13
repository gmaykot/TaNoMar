import { describe, expect, it } from 'vitest';
import { osmMosaic, osmMosaicPoint, osmTileCoords, osmTileUrl } from './osmTiles';

describe('osmTiles', () => {
  it('monta a URL do tile e o mosaico centrado no local', () => {
    const point = osmTileCoords(-27.65407, -48.46908, 13);
    expect(point.x).toBeGreaterThan(2400);
    expect(point.y).toBeGreaterThan(3500);
    expect(osmTileUrl(13, point.x, point.y)).toMatch(
      /^https:\/\/tile\.openstreetmap\.org\/13\/\d+\/\d+\.png$/,
    );
    const mosaic = osmMosaic(-27.65407, -48.46908, 13);
    expect(mosaic.tiles).toHaveLength(9);
    expect(mosaic.point.left).toBeGreaterThan(30);
    expect(mosaic.point.left).toBeLessThan(70);
    expect(mosaic.point.top).toBeGreaterThan(30);
    expect(mosaic.point.top).toBeLessThan(70);
  });

  it('projeta um segundo ponto no mesmo mosaico', () => {
    const from = osmMosaicPoint(-27.65407, -48.47908, -27.65407, -48.46908, 13);
    const dest = osmMosaic(-27.65407, -48.46908, 13).point;
    expect(from.left).toBeLessThan(dest.left);
  });
});
