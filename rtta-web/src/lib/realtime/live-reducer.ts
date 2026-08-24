import type {
  LiveMeetingState,
  LiveServerEvent,
  TranslationServerEvent,
  TranslationUtterance,
} from "@/types/live"

export const MAX_RECENT_FINALS = 5
const MAX_PAUSED_FINALS = 50
const MAX_COMMITTED_FINAL_IDS = 100

export type LiveMeetingAction =
  | { type: "SOCKET_CONNECTING" }
  | { type: "SOCKET_CONNECTED" }
  | { type: "SOCKET_RECONNECTING" }
  | { type: "SOCKET_DISCONNECTED" }
  | { type: "SERVER_EVENT"; event: LiveServerEvent }
  | { type: "SET_FOLLOW_LIVE"; followLive: boolean }
  | { type: "CLEAR_ERROR" }

export const initialLiveMeetingState: LiveMeetingState = {
  connectionState: "connecting",
  sessionState: "idle",
  activeSessionId: null,
  sessionStartedAt: null,
  currentPartial: null,
  recentFinals: [],
  committedFinalIds: [],
  followLive: true,
  lastError: null,
}

function eventId(event: TranslationServerEvent): string {
  return [
    event.sessionId,
    event.offsetMs,
    event.durationMs,
    event.sourceText,
    event.translatedText,
  ].join("|")
}

function toUtterance(event: TranslationServerEvent): TranslationUtterance {
  return {
    id: eventId(event),
    sessionId: event.sessionId,
    sourceText: event.sourceText,
    translatedText: event.translatedText,
    offsetMs: event.offsetMs,
    durationMs: event.durationMs,
    observedAt: event.observedAt,
  }
}

function applyServerEvent(state: LiveMeetingState, event: LiveServerEvent): LiveMeetingState {
  switch (event.type) {
    case "SESSION_STATE": {
      if (event.state === "IDLE") {
        return {
          ...state,
          sessionState: "idle",
          activeSessionId: null,
          sessionStartedAt: null,
          currentPartial: null,
          followLive: true,
        }
      }
      const isSameSession = state.activeSessionId === event.sessionId
      return {
        ...state,
        sessionState: "live",
        activeSessionId: event.sessionId,
        sessionStartedAt: event.startedAt,
        currentPartial: isSameSession ? state.currentPartial : null,
        recentFinals: isSameSession ? state.recentFinals : [],
        committedFinalIds: isSameSession ? state.committedFinalIds : [],
        followLive: isSameSession ? state.followLive : true,
        lastError: null,
      }
    }
    case "SESSION_STARTED":
      return {
        ...state,
        sessionState: "live",
        activeSessionId: event.sessionId,
        sessionStartedAt: event.startedAt,
        currentPartial: null,
        recentFinals: [],
        committedFinalIds: [],
        followLive: true,
        lastError: null,
      }
    case "TRANSLATION": {
      if (state.sessionState !== "live" || event.sessionId !== state.activeSessionId) {
        return state
      }
      const utterance = toUtterance(event)
      if (event.eventType === "PARTIAL") {
        return { ...state, currentPartial: utterance }
      }
      if (state.committedFinalIds.includes(utterance.id)) {
        return state
      }
      return {
        ...state,
        currentPartial: null,
        recentFinals: [...state.recentFinals, utterance].slice(
          -(state.followLive ? MAX_RECENT_FINALS : MAX_PAUSED_FINALS),
        ),
        committedFinalIds: [...state.committedFinalIds, utterance.id].slice(-MAX_COMMITTED_FINAL_IDS),
      }
    }
    case "SESSION_STOPPED":
      if (event.sessionId !== state.activeSessionId) return state
      return {
        ...state,
        sessionState: "stopped",
        activeSessionId: null,
        sessionStartedAt: null,
        currentPartial: null,
        followLive: true,
      }
    case "ERROR":
      if (event.sessionId && state.activeSessionId && event.sessionId !== state.activeSessionId) {
        return state
      }
      return { ...state, lastError: event.message }
  }
}

export function liveMeetingReducer(
  state: LiveMeetingState,
  action: LiveMeetingAction,
): LiveMeetingState {
  switch (action.type) {
    case "SOCKET_CONNECTING":
      return { ...state, connectionState: "connecting" }
    case "SOCKET_CONNECTED":
      return { ...state, connectionState: "connected", lastError: null }
    case "SOCKET_RECONNECTING":
      return { ...state, connectionState: "reconnecting" }
    case "SOCKET_DISCONNECTED":
      return { ...state, connectionState: "disconnected" }
    case "SERVER_EVENT":
      return applyServerEvent(state, action.event)
    case "SET_FOLLOW_LIVE":
      return {
        ...state,
        followLive: action.followLive,
        recentFinals: action.followLive
          ? state.recentFinals.slice(-MAX_RECENT_FINALS)
          : state.recentFinals,
      }
    case "CLEAR_ERROR":
      return { ...state, lastError: null }
  }
}
