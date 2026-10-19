/**
 * Cliente HTTP tipado hacia el backend (`/api/v1/*`).
 *
 * Todas las respuestas siguen el envelope uniforme del backend:
 *   éxito:  { ok: true,  data, meta? }
 *   error:  { ok: false, error: { code, message, details? } }
 *
 * Funciona tanto en el servidor (Astro) como en islas de React en el navegador.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown[];
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Error lanzado por el cliente cuando el backend responde `ok: false` o falla el HTTP. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface ApiClientOptions {
  /** URL base del API. Por defecto `PUBLIC_API_URL`. */
  baseUrl?: string;
  /** `fetch` alternativo (útil para tests). */
  fetch?: typeof fetch;
}

export interface ApiClient {
  readonly baseUrl: string;
  get<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<ApiSuccess<T>>;
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<ApiSuccess<T>>;
  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<ApiSuccess<T>>;
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>): Promise<ApiSuccess<T>>;
  delete<T>(path: string, options?: Omit<RequestOptions, 'body'>): Promise<ApiSuccess<T>>;
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function isFailure(payload: unknown): payload is ApiFailure {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'ok' in payload &&
    (payload as { ok: unknown }).ok === false
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Crea un cliente API. Por defecto exporta `api` ya configurado con `PUBLIC_API_URL`. */
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = (options.baseUrl ?? import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787/api/v1').replace(
    /\/$/,
    '',
  );
  const doFetch = options.fetch ?? fetch;

  async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
    const response = await doFetch(`${baseUrl}${path}${buildQuery(options.query)}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      // `include` para enviar la cookie de sesión del panel admin (cross-origin en dev).
      credentials: options.credentials ?? 'include',
    });

    const payload = await parseJson(response);

    if (!response.ok || isFailure(payload)) {
      const error = isFailure(payload) ? payload.error : undefined;
      throw new ApiError(
        response.status,
        error?.code ?? 'HTTP_ERROR',
        error?.message ?? `Error ${response.status}`,
        Array.isArray(error?.details) ? error.details : [],
      );
    }

    return (payload as ApiSuccess<T> | null) ?? ({ ok: true, data: null as T });
  }

  return {
    baseUrl,
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    delete: (path, options) => request('DELETE', path, options),
  };
}

/** Instancia por defecto lista para usar. */
export const api: ApiClient = createApiClient();
