const basePath = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL.slice(0, -1)
  : import.meta.env.BASE_URL;
const API_PREFIX = `${basePath}/api`;
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiError extends Error {
  public readonly status: number;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, requestId?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

let csrfToken: string | null = null;

interface ApiEnvelope {
  error?: string;
  requestId?: string;
  details?: unknown;
  csrfToken?: string;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return null;
}

export function setCsrfToken(nextToken: string | null | undefined): void {
  csrfToken = nextToken ?? null;
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${API_PREFIX}/auth/csrf-token`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json'
    }
  });

  const payload = (await parseResponseBody(response)) as ApiEnvelope | null;

  if (!response.ok || !payload?.csrfToken) {
    throw new ApiError(payload?.error ?? 'Unable to fetch CSRF token.', response.status, payload?.requestId);
  }

  csrfToken = payload.csrfToken;
  return csrfToken;
}

async function ensureCsrfToken(): Promise<string> {
  if (!csrfToken) {
    return fetchCsrfToken();
  }

  return csrfToken;
}

function shouldUseJsonContentType(body: BodyInit | null | undefined): boolean {
  return Boolean(body && !(body instanceof FormData));
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { skipCsrf?: boolean } = {},
  allowCsrfRetry = true
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');

  if (shouldUseJsonContentType(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (STATE_CHANGING_METHODS.has(method) && !init.skipCsrf) {
    headers.set('X-CSRF-Token', await ensureCsrfToken());
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include'
  });

  const payload = (await parseResponseBody(response)) as (ApiEnvelope & T) | null;

  if (payload?.csrfToken) {
    setCsrfToken(payload.csrfToken);
  }

  if (!response.ok) {
    if (response.status === 403 && payload?.error === 'Invalid CSRF token.' && allowCsrfRetry) {
      await fetchCsrfToken();
      return apiRequest<T>(path, init, false);
    }

    throw new ApiError(payload?.error ?? 'Request failed.', response.status, payload?.requestId, payload?.details);
  }

  return payload as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
