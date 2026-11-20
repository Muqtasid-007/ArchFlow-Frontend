/**
 * API client.
 *
 * The access token lives only in memory (never localStorage), while the refresh
 * token is an httpOnly cookie scoped to /api/auth. A 401 triggers one shared
 * silent refresh, then the original request is retried once.
 */

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiRequestError extends Error {
  constructor(message, { status, details, code } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

async function rawRequest(path, options = {}) {
  const { method = 'GET', body, signal } = options;
  const headers = { ...(options.headers ?? {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiRequestError(payload?.error?.message ?? `Request failed (${response.status})`, {
      status: response.status,
      details: payload?.error?.details,
      code: payload?.error?.code,
    });
  }

  return payload;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/refresh', { method: 'POST' })
      .then((payload) => {
        setAccessToken(payload.accessToken);
        return payload;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (error) {
    const shouldRefresh =
      error instanceof ApiRequestError &&
      error.status === 401 &&
      !path.startsWith('/auth/') &&
      options.retry !== false;

    if (!shouldRefresh) throw error;

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      setAccessToken(null);
      throw error;
    }
    return rawRequest(path, options);
  }
}

export async function downloadProjectZip(boardId) {
  const response = await fetch(`/api/boards/${boardId}/generate/download`, {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiRequestError(payload?.error?.message ?? 'Could not generate the project archive', {
      status: response.status,
    });
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'archflow-project.zip';

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}
