import { ContractError } from '@/shared/api/errors';
import type { SpotWebcam, WebcamProviderId, WebcamSearchItem } from '../types/webcam';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function readProvider(value: unknown): WebcamProviderId | null {
  const provider = readString(value)?.trim();
  return provider ? provider : null;
}

function readHttps(value: unknown) {
  const url = readString(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function parseSpotWebcam(value: unknown): SpotWebcam {
  if (!isRecord(value)) throw new ContractError('Câmera do local inválida.');
  if (value.linked === false) {
    return {
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
    };
  }
  const provider = readProvider(value.provider);
  const externalId = readString(value.externalId);
  const name = readString(value.name);
  if (!provider || !externalId || !name) throw new ContractError('Câmera do local incompleta.');
  const playerRecord = isRecord(value.player) ? value.player : null;
  const embedUrl = playerRecord ? readHttps(playerRecord.embedUrl) : null;
  const player =
    playerRecord && playerRecord.kind === 'embed' && embedUrl
      ? { kind: 'embed' as const, embedUrl }
      : null;
  return {
    linked: true,
    provider,
    providerDisplayName: readString(value.providerDisplayName),
    externalId,
    name,
    latitude: readNumber(value.latitude),
    longitude: readNumber(value.longitude),
    isAvailable: readBoolean(value.isAvailable) === true,
    isLive: readBoolean(value.isLive) === true,
    previewUrl: readHttps(value.previewUrl),
    player,
  };
}

export function parseWebcamSearch(value: unknown): WebcamSearchItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new ContractError('Pesquisa de câmeras inválida.');
  }
  return value.items.map((item) => {
    if (!isRecord(item)) throw new ContractError('Câmera da pesquisa inválida.');
    const provider = readProvider(item.provider);
    const externalId = readString(item.externalId);
    const name = readString(item.name);
    const latitude = readNumber(item.latitude);
    const longitude = readNumber(item.longitude);
    const distanceKm = readNumber(item.distanceKm);
    const isLive = readBoolean(item.isLive);
    const hasPlayer = readBoolean(item.hasPlayer);
    if (
      !provider ||
      !externalId ||
      !name ||
      latitude === null ||
      longitude === null ||
      distanceKm === null ||
      isLive === null ||
      hasPlayer === null
    ) {
      throw new ContractError('Câmera da pesquisa incompleta.');
    }
    return {
      provider,
      providerDisplayName: readString(item.providerDisplayName),
      externalId,
      name,
      latitude,
      longitude,
      distanceKm,
      isLive,
      hasPlayer,
      previewUrl: readHttps(item.previewUrl),
    };
  });
}

export function webcamPreviewUrl(
  webcam: Pick<SpotWebcam, 'previewUrl' | 'provider' | 'externalId'>,
) {
  if (webcam.previewUrl) return webcam.previewUrl;
  if (webcam.provider === 'youtube' && webcam.externalId) {
    return `https://i.ytimg.com/vi/${webcam.externalId}/hqdefault.jpg`;
  }
  return null;
}

export function webcamAutoplayUrl(embedUrl: string) {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '1');
    url.searchParams.set('playsinline', '1');
    return url.toString();
  } catch {
    return embedUrl;
  }
}

export function formatDistanceKm(distanceKm: number) {
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}

export function webcamSearchCaption(item: WebcamSearchItem) {
  if (item.provider === 'youtube') return item.providerDisplayName ?? 'YouTube';
  return formatDistanceKm(item.distanceKm);
}
