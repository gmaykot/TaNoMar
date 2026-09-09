import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { parseSpotWebcam, parseWebcamSearch } from '../mappers/webcamMapper';
import type { SpotWebcam, WebcamLinkInput, WebcamSearchItem } from '../types/webcam';

function webcamPath(spotId: string, admin: boolean, suffix = '/webcam') {
  const base = admin ? '/admin/fishing-spots' : '/fishing-spots';
  return `${base}/${encodeURIComponent(spotId)}${suffix}`;
}

export async function getSpotWebcam(spotId: string, admin = false): Promise<SpotWebcam | null> {
  try {
    return parseSpotWebcam(await apiRequest(webcamPath(spotId, admin)));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function searchSpotWebcams(spotId: string): Promise<WebcamSearchItem[]> {
  return parseWebcamSearch(await apiRequest(webcamPath(spotId, true, '/webcams/search')));
}

export async function lookupYouTubeWebcam(
  spotId: string,
  query: string,
): Promise<WebcamSearchItem[]> {
  const q = new URLSearchParams({ q: query.trim() });
  return parseWebcamSearch(
    await apiRequest(`${webcamPath(spotId, true, '/webcams/youtube')}?${q.toString()}`),
  );
}

export async function linkSpotWebcam(
  spotId: string,
  input: WebcamLinkInput,
): Promise<SpotWebcam> {
  return parseSpotWebcam(
    await apiRequest(webcamPath(spotId, true), {
      method: 'POST',
      body: JSON.stringify({ provider: input.provider, externalId: input.externalId }),
    }),
  );
}

export async function unlinkSpotWebcam(spotId: string) {
  await apiRequest(webcamPath(spotId, true), { method: 'DELETE' });
}
