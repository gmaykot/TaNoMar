export type WebcamProviderId = string;

export interface WebcamSearchItem {
  provider: WebcamProviderId;
  providerDisplayName: string | null;
  externalId: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  isLive: boolean;
  hasPlayer: boolean;
  previewUrl: string | null;
}

export interface WebcamPlayer {
  kind: 'embed';
  embedUrl: string;
}

export interface SpotWebcam {
  linked: boolean;
  provider: WebcamProviderId | null;
  providerDisplayName: string | null;
  externalId: string | null;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  isAvailable: boolean;
  isLive: boolean;
  player: WebcamPlayer | null;
}

export interface WebcamLinkInput {
  provider: WebcamProviderId;
  externalId: string;
}
