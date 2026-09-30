import { API_URL } from './config';
import { storage } from './storage';

/**
 * 웹 Frontend/src/api/axios.js 와 동일한 규칙을 따르는 fetch 기반 클라이언트.
 * - Authorization: Bearer <accessToken>
 * - 401 수신 시 /auth/refresh 로 토큰을 갱신한 뒤 원래 요청을 한 번 재시도
 * - 갱신 실패 시 세션 정리 후 로그아웃 콜백 호출
 */

const KEYS = { TOKEN: 'ang.token', REFRESH: 'ang.refreshToken', USER: 'ang.user' } as const;

export type User = {
  id: number;
  empNo: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  dept?: string;
  role?: string;
  roleLevel?: number;
  avatar?: string;
  profileImageUrl?: string;
  departments?: { scopeId: number; scopeName: string; scopeCode: string; position?: string }[];
};

type Tokens = { accessToken: string | null; refreshToken: string | null };

const tokens: Tokens = { accessToken: null, refreshToken: null };
let onSessionExpired: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export const session = {
  async load(): Promise<User | null> {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      storage.getItem(KEYS.TOKEN),
      storage.getItem(KEYS.REFRESH),
      storage.getItem(KEYS.USER),
    ]);
    tokens.accessToken = accessToken;
    tokens.refreshToken = refreshToken;
    if (!accessToken || !userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  },
  async save(accessToken: string, refreshToken: string | null, user?: User) {
    tokens.accessToken = accessToken;
    if (refreshToken) tokens.refreshToken = refreshToken;
    await storage.setItem(KEYS.TOKEN, accessToken);
    if (refreshToken) await storage.setItem(KEYS.REFRESH, refreshToken);
    if (user) await storage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async clear() {
    tokens.accessToken = null;
    tokens.refreshToken = null;
    await Promise.all(Object.values(KEYS).map((k) => storage.removeItem(k)));
  },
  getToken: () => tokens.accessToken,
  setOnExpired(cb: (() => void) | null) {
    onSessionExpired = cb;
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Query;
  body?: unknown;
  /** true 이면 Authorization 헤더를 붙이지 않는다 (로그인 등) */
  anonymous?: boolean;
};

const buildUrl = (path: string, params?: Query) => {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
};

async function refreshAccessToken(): Promise<boolean> {
  if (!tokens.refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        const { accessToken, refreshToken } = json?.data ?? {};
        if (!accessToken) return false;
        await session.save(accessToken, refreshToken ?? null);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { method = 'GET', params, body, anonymous } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (!anonymous && tokens.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
  }

  if (res.status === 401 && !anonymous && !retried) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, options, true);
    await session.clear();
    onSessionExpired?.();
    throw new ApiError(401, '로그인이 만료되었습니다. 다시 로그인해주세요.');
  }

  const data = await parseBody(res);
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && (data as { message?: string }).message) ||
      `요청에 실패했습니다. (${res.status})`;
    throw new ApiError(res.status, String(message), data);
  }
  return data as T;
}

/** ApiResponse<T> 의 data 를 꺼낸다 (웹 responseUtils.unwrap 과 동일) */
export async function call<T>(path: string, options?: RequestOptions): Promise<T> {
  const json = await request<{ data?: T }>(path, options);
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export type Page<T> = { content: T[]; totalElements: number; totalPages: number; hasNext?: boolean };

/** 배열 / Page / PagedResponse 등 다양한 래핑을 목록으로 정규화 */
export function toList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.content)) return d.content as T[];
    if (Array.isArray(d.list)) return d.list as T[];
    if (Array.isArray(d.data)) return d.data as T[];
  }
  return [];
}

export function toTotal(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.totalElements === 'number') return d.totalElements;
    if (Array.isArray(d.content)) return d.content.length;
  }
  return 0;
}

export const errorMessage = (err: unknown, fallback = '요청 처리 중 오류가 발생했습니다.') =>
  err instanceof Error && err.message ? err.message : fallback;
