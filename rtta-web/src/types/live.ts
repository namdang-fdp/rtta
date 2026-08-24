export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"

export type MeetingSessionState = "idle" | "live" | "stopped"

export type TranslationEventType = "PARTIAL" | "FINAL"

export interface SessionStateEvent {
  type: "SESSION_STATE"
  state: "IDLE" | "LIVE"
  sessionId: string | null
  startedAt: string | null
}

export interface SessionStartedEvent {
  type: "SESSION_STARTED"
  sessionId: string
  startedAt: string
}

export interface TranslationServerEvent {
  type: "TRANSLATION"
  sessionId: string
  eventType: TranslationEventType
  sourceText: string
  translatedText: string
  offsetMs: number
  durationMs: number
  observedAt: string
}

export interface SessionStoppedEvent {
  type: "SESSION_STOPPED"
  sessionId: string
  stoppedAt: string
}

export interface LiveErrorEvent {
  type: "ERROR"
  sessionId: string | null
  message: string
  observedAt: string
}

export type LiveServerEvent =
  | SessionStateEvent
  | SessionStartedEvent
  | TranslationServerEvent
  | SessionStoppedEvent
  | LiveErrorEvent

export interface TranslationUtterance {
  id: string
  sessionId: string
  sourceText: string
  translatedText: string
  offsetMs: number
  durationMs: number
  observedAt: string
}

export interface LiveMeetingState {
  connectionState: ConnectionState
  sessionState: MeetingSessionState
  activeSessionId: string | null
  sessionStartedAt: string | null
  currentPartial: TranslationUtterance | null
  recentFinals: TranslationUtterance[]
  committedFinalIds: string[]
  followLive: boolean
  lastError: string | null
}
