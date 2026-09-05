let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setOnSessionLost(handler: (() => void) | null) {
  onSessionLost = handler;
}

export function notifySessionLost() {
  accessToken = null;
  onSessionLost?.();
}

export function resetApiSession() {
  accessToken = null;
  onSessionLost = null;
}
