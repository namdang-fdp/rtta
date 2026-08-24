export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_RTTA_API_URL ?? "http://localhost:8080").replace(/\/$/, "")
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(
      response.status >= 500
        ? "RTTA could not reach the meeting archive. Please try again."
        : "The requested meeting data is unavailable.",
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
