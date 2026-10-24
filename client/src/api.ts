export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

const send = (path: string, method: string, body?: unknown) =>
  fetch(`/api/v1${path}`, {
    method,
    credentials: 'include',
    // FormData: the browser sets the multipart Content-Type (with boundary) itself.
    headers: { 'X-Requested-With': 'prepai', ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

// Refresh tokens are single-use, so concurrent 401s must share ONE refresh call.
let refreshing: Promise<boolean> | null = null;
const refreshSession = () => {
  refreshing ??= send('/auth/refresh', 'POST')
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}, retried = false): Promise<T> {
  let res: Response;
  try {
    res = await send(path, opts.method ?? 'GET', opts.body);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshSession()) return api<T>(path, opts, true);
    onUnauthorized?.();
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? 'Something went wrong. Please try again.');
  return data as T;
}
