import { apiBaseUrl } from './env';
import { ApiError } from './errors';
import { getAccessToken, notifySessionLost, setAccessToken } from './session';

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
let refreshHold: ReturnType<typeof setTimeout> | null = null;

function apiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseAccessToken(response: Response) {
  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('accessToken' in payload) ||
    typeof payload.accessToken !== 'string' ||
    payload.accessToken.length === 0
  ) {
    return null;
  }
  setAccessToken(payload.accessToken);
  return payload.accessToken;
}

async function refreshAccessToken() {
  const response = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) return null;
  return parseAccessToken(response);
}

export function refreshAccessTokenOnce() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshHold = setTimeout(() => {
        refreshPromise = null;
        refreshHold = null;
      }, 750);
    });
  }
  return refreshPromise;
}

async function send(path: string, options: ApiRequestOptions) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });
}

async function readBody(response: Response) {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  return response.json() as Promise<unknown>;
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}) {
  let response = await send(path, options);

  if (response.status === 401 && !options.skipRefresh) {
    const token = await refreshAccessTokenOnce();
    if (token) {
      response = await send(path, { ...options, skipRefresh: true });
    } else {
      notifySessionLost();
      throw new ApiError(401, 'Sessão expirada.');
    }
  }

  const body = await readBody(response);
  if (!response.ok) {
    throw toApiError(response.status, body);
  }

  return body as T;
}

function toApiError(status: number, body: unknown) {
  const record =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  const code = typeof record?.code === 'string' ? record.code : null;
  const detail =
    typeof record?.detail === 'string'
      ? record.detail
      : typeof record?.title === 'string'
        ? record.title
        : null;
  return new ApiError(status, detail ?? `A API respondeu ${status}.`, code, detail);
}

export function resetApiClientState() {
  if (refreshHold) {
    clearTimeout(refreshHold);
    refreshHold = null;
  }
  refreshPromise = null;
}
