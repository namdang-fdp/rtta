export interface RttaRuntimeConfig {
  apiUrl: string
  liveWebSocketUrl: string
}

declare global {
  interface Window {
    __RTTA_CONFIG__?: RttaRuntimeConfig
  }
}

export function getRuntimeConfig(): RttaRuntimeConfig {
  if (typeof window !== "undefined" && window.__RTTA_CONFIG__) {
    return window.__RTTA_CONFIG__
  }
  return {
    apiUrl: process.env.NEXT_PUBLIC_RTTA_API_URL ?? "http://localhost:8080",
    liveWebSocketUrl:
      process.env.NEXT_PUBLIC_RTTA_LIVE_WS_URL ?? "ws://localhost:8080/ws/live",
  }
}
