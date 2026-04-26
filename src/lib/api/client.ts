import { env } from '@/lib/env';
import { tokenStore } from '@/lib/auth/tokens';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiProblem, TokenRefreshResponse } from '@/types/api';

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

function buildUrl(path: string): string {
  return path.startsWith('http') ? path : `${env.apiBaseUrl}${path}`;
}

function isJsonResponse(res: Response): boolean {
  return res.headers.get('content-type')?.includes('application/json') ?? false;
}

async function readResponseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;

  try {
    return isJsonResponse(res) ? await res.json() : await res.text();
  } catch {
    return undefined;
  }
}

function getErrorMessage(details: unknown, status: number): string {
  if (details && typeof details === 'object') {
    const record = details as Record<string, unknown>;

    if (typeof record.message === 'string') return record.message;
    if (typeof record.detail === 'string') return record.detail;

    const firstError = Object.values(record).flat().find(Boolean);
    if (firstError) return String(firstError);
  }

  if (typeof details === 'string' && details.trim()) return details;

  return `Request failed with status ${status}`;
}

async function parseError(res: Response): Promise<ApiProblem> {
  const details = await readResponseBody(res);

  return {
    message: getErrorMessage(details, res.status),
    status: res.status,
    details,
  };
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;

  refreshPromise ??= fetch(buildUrl(endpoints.auth.refresh), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
    cache: 'no-store',
  })
    .then(async (res) => {
      if (!res.ok) return null;

      const data = (await res.json()) as TokenRefreshResponse;

      if (!data.access) return null;

      tokenStore.setAccess(data.access);
      return data.access;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function createHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth) {
    const access = tokenStore.getAccess();
    if (access) headers.set('Authorization', `Bearer ${access}`);
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers = createHeaders(options);

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (res.status === 401 && options.retryOnUnauthorized !== false && !options.skipAuth) {
    const newAccess = await refreshAccessToken();

    if (newAccess) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }

    tokenStore.clear();
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  return (await readResponseBody(res)) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};