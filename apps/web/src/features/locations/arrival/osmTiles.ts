export function osmTileCoords(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((longitude + 180) / 360) * n;
  const latRad = (latitude * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y, zoom };
}

export function osmTileUrl(zoom: number, x: number, y: number) {
  const n = 2 ** zoom;
  const wrappedX = ((Math.floor(x) % n) + n) % n;
  const clampedY = Math.min(n - 1, Math.max(0, Math.floor(y)));
  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
}

export interface OsmMosaicTile {
  key: string;
  src: string;
  column: number;
  row: number;
}

export function osmMosaic(latitude: number, longitude: number, zoom = 13) {
  const point = osmTileCoords(latitude, longitude, zoom);
  const originX = Math.floor(point.x) - 1;
  const originY = Math.floor(point.y) - 1;
  const tiles: OsmMosaicTile[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const x = originX + column;
      const y = originY + row;
      tiles.push({
        key: `${zoom}/${x}/${y}`,
        src: osmTileUrl(zoom, x, y),
        column,
        row,
      });
    }
  }
  return {
    tiles,
    point: {
      left: ((point.x - originX) / 3) * 100,
      top: ((point.y - originY) / 3) * 100,
    },
  };
}

export function osmMosaicPoint(
  latitude: number,
  longitude: number,
  originLatitude: number,
  originLongitude: number,
  zoom = 13,
) {
  const origin = osmTileCoords(originLatitude, originLongitude, zoom);
  const point = osmTileCoords(latitude, longitude, zoom);
  const originX = Math.floor(origin.x) - 1;
  const originY = Math.floor(origin.y) - 1;
  return {
    left: ((point.x - originX) / 3) * 100,
    top: ((point.y - originY) / 3) * 100,
  };
}
