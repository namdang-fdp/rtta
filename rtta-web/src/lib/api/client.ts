import { getRuntimeConfig } from "@/lib/runtime-config"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface AuthSession {
  authenticated: boolean
  csrfToken: string
}

let csrfToken: string | null = null

export function getApiBaseUrl(): string {
  return getRuntimeConfig().apiUrl.replace(/\/$/, "")
}

async function rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers,
  })
}

export async function getAuthSession(): Promise<AuthSession> {
  const response = await rawRequest("/api/auth/me")
  if (!response.ok) throw new ApiError("Không thể kiểm tra phiên RTTA.", response.status)
  const session = (await response.json()) as AuthSession
  csrfToken = session.csrfToken
  return session
}

export async function loginHousehold(code: string): Promise<AuthSession> {
  if (!csrfToken) await getAuthSession()
  const response = await rawRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrfToken ?? "" },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new ApiError("Mã gia đình không đúng hoặc tạm thời chưa thể sử dụng.", response.status)
  const session = (await response.json()) as AuthSession
  csrfToken = session.csrfToken
  return session
}

export async function logoutHousehold(): Promise<void> {
  if (!csrfToken) await getAuthSession()
  const response = await rawRequest("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-TOKEN": csrfToken ?? "" },
  })
  csrfToken = null
  if (!response.ok) throw new ApiError("Không thể đăng xuất RTTA.", response.status)
}

function mutates(method: string | undefined): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase())
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (mutates(init.method) && !csrfToken) await getAuthSession()
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  if (mutates(init.method) && csrfToken) headers.set("X-CSRF-TOKEN", csrfToken)
  const response = await rawRequest(path, { ...init, headers })

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("rtta:unauthenticated"))
  }
  if (!response.ok) {
    throw new ApiError(
      response.status >= 500
        ? "RTTA chưa thể hoàn tất yêu cầu. Vui lòng thử lại."
        : "Dữ liệu cuộc họp bạn yêu cầu hiện không khả dụng.",
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
