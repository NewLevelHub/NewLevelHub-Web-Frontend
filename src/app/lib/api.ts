const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_API_BASE_URL ||
  "/api/v1";

type HttpMethod = "GET";
type AuthHttpMethod = "GET" | "POST";

const ACCESS_TOKEN_KEY = "nlh_access_token";
const REFRESH_TOKEN_KEY = "nlh_refresh_token";

export interface PingResponse {
  message: string;
}

export interface ServerTimeResponse {
  utc_time: string;
}

export interface BuildInfoResponse {
  service: string;
  version: string;
  status: string;
}

export interface SystemFeaturesResponse {
  features: {
    auth: boolean;
    booking: boolean;
    crm: boolean;
    iot: boolean;
  };
}

export interface SystemEnvironmentResponse {
  environment: string;
  debug: boolean;
}

export interface SystemUptimeResponse {
  started_at: string;
  uptime_seconds: number;
}

export interface UserRoleDefinition {
  code: string;
  label: string;
  description: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface AuthPayload {
  user: CurrentUser;
  tokens: AuthTokens;
  message: string;
}

export interface RegisterInput {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  password: string;
  password_confirm: string;
  role?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SystemSnapshot {
  ping: PingResponse;
  serverTime: ServerTimeResponse;
  buildInfo: BuildInfoResponse;
  features: SystemFeaturesResponse;
  environment: SystemEnvironmentResponse;
  uptime: SystemUptimeResponse;
  roles: UserRoleDefinition[];
}

async function request<T>(path: string, method: HttpMethod = "GET"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAuthToken(): Promise<boolean> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return false;

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const data = (await response.json()) as { access?: string };
  if (!data?.access) {
    clearTokens();
    return false;
  }

  storeTokens({ access: data.access, refresh });
  return true;
}

async function authRequest<T>(
  path: string,
  method: AuthHttpMethod = "GET",
  body?: unknown,
  retryAfterRefresh = true,
): Promise<T> {
  const access = getStoredAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401 && retryAfterRefresh && getStoredRefreshToken()) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return authRequest<T>(path, method, body, false);
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.error || data?.detail || `HTTP ${response.status} for ${path}`;
    throw new Error(String(message));
  }

  return (await response.json()) as T;
}

export async function registerUser(payload: RegisterInput): Promise<AuthPayload> {
  const result = await authRequest<AuthPayload>("/auth/register/", "POST", payload, false);
  if (result.tokens) storeTokens(result.tokens);
  return result;
}

export async function loginUser(payload: LoginInput): Promise<AuthPayload> {
  const result = await authRequest<AuthPayload>("/auth/login/", "POST", payload, false);
  if (result.tokens) storeTokens(result.tokens);
  return result;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return authRequest<CurrentUser>("/auth/me/");
}

export async function logoutUser(): Promise<void> {
  const refresh = getStoredRefreshToken();
  if (!refresh) {
    clearTokens();
    return;
  }

  try {
    await authRequest<{ message: string }>("/auth/logout/", "POST", { refresh });
  } finally {
    clearTokens();
  }
}

export async function fetchSystemSnapshot(): Promise<SystemSnapshot> {
  const [ping, serverTime, buildInfo, features, environment, uptime, roles] = await Promise.all([
    request<PingResponse>("/ping/"),
    request<ServerTimeResponse>("/time/"),
    request<BuildInfoResponse>("/build-info/"),
    request<SystemFeaturesResponse>("/system/features/"),
    request<SystemEnvironmentResponse>("/system/environment/"),
    request<SystemUptimeResponse>("/system/uptime/"),
    request<UserRoleDefinition[]>("/auth/roles/"),
  ]);

  return { ping, serverTime, buildInfo, features, environment, uptime, roles };
}
