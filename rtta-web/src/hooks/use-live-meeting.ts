"use client"

import { useCallback, useEffect, useMemo, useReducer } from "react"

import { parseLiveServerEvent } from "@/lib/protocol/live-protocol"
import { initialLiveMeetingState, liveMeetingReducer } from "@/lib/realtime/live-reducer"
import { getRuntimeConfig } from "@/lib/runtime-config"

const DEFAULT_RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 12_000, 15_000]
const defaultCreateWebSocket = (socketUrl: string) => new WebSocket(socketUrl)

export interface UseLiveMeetingOptions {
  url?: string
  createWebSocket?: (url: string) => WebSocket
  reconnectDelays?: number[]
}

export function getLiveWebSocketUrl(): string {
  return getRuntimeConfig().liveWebSocketUrl
}

export function useLiveMeeting(options: UseLiveMeetingOptions = {}) {
  const [state, dispatch] = useReducer(liveMeetingReducer, initialLiveMeetingState)
  const url = options.url ?? getLiveWebSocketUrl()
  const createWebSocket = options.createWebSocket ?? defaultCreateWebSocket
  const reconnectDelays = options.reconnectDelays ?? DEFAULT_RECONNECT_DELAYS

  useEffect(() => {
    let disposed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempt = 0

    const connect = () => {
      if (disposed) return
      dispatch({ type: reconnectAttempt === 0 ? "SOCKET_CONNECTING" : "SOCKET_RECONNECTING" })
      socket = createWebSocket(url)

      socket.onopen = () => {
        if (disposed) return
        reconnectAttempt = 0
        dispatch({ type: "SOCKET_CONNECTED" })
      }

      socket.onmessage = (message) => {
        if (disposed || typeof message.data !== "string") return
        const event = parseLiveServerEvent(message.data)
        if (event) dispatch({ type: "SERVER_EVENT", event })
      }

      socket.onerror = () => {
        // The close event owns retry scheduling; raw socket errors are intentionally not shown.
      }

      socket.onclose = () => {
        if (disposed) return
        if (reconnectAttempt >= reconnectDelays.length) {
          dispatch({ type: "SOCKET_DISCONNECTED" })
          return
        }
        const delay = reconnectDelays[reconnectAttempt]
        reconnectAttempt += 1
        dispatch({ type: "SOCKET_RECONNECTING" })
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close(1000, "RTTA Web closed")
      }
    }
  }, [createWebSocket, reconnectDelays, url])

  const setFollowLive = useCallback((followLive: boolean) => {
    dispatch({ type: "SET_FOLLOW_LIVE", followLive })
  }, [])

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), [])

  return useMemo(
    () => ({ ...state, setFollowLive, clearError }),
    [clearError, setFollowLive, state],
  )
}
