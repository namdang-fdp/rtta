import type { CaptureMetrics } from "../audio/metrics";
import {
  createBackendState,
  isBackendState,
  type BackendState,
} from "../transport/state";
import {
  isTranslationSnapshot,
  type TranslationSnapshot,
} from "../translation/state";

export const CAPTURE_MESSAGE = {
  START: "rtta:capture/start",
  STOP: "rtta:capture/stop",
  GET_STATE: "rtta:capture/get-state",
  STATE_CHANGED: "rtta:capture/state-changed",
  OFFSCREEN_START: "rtta:offscreen/start",
  OFFSCREEN_STOP: "rtta:offscreen/stop",
  OFFSCREEN_GET_STATE: "rtta:offscreen/get-state",
  OFFSCREEN_STATE_CHANGED: "rtta:offscreen/state-changed",
} as const;

export type CapturePhase =
  | "ready"
  | "starting"
  | "capturing"
  | "stopping"
  | "error";

export interface CaptureState {
  readonly phase: CapturePhase;
  readonly backend: BackendState;
  readonly tabId: number | null;
  readonly metrics: CaptureMetrics | null;
  readonly translation: TranslationSnapshot | null;
  readonly error: string | null;
  readonly updatedAt: number;
}

export type CaptureRuntimeMessage =
  | { readonly type: typeof CAPTURE_MESSAGE.START }
  | { readonly type: typeof CAPTURE_MESSAGE.STOP }
  | { readonly type: typeof CAPTURE_MESSAGE.GET_STATE }
  | {
      readonly type: typeof CAPTURE_MESSAGE.STATE_CHANGED;
      readonly state: CaptureState;
    }
  | {
      readonly type: typeof CAPTURE_MESSAGE.OFFSCREEN_START;
      readonly streamId: string;
      readonly tabId: number;
      readonly householdCode: string;
    }
  | { readonly type: typeof CAPTURE_MESSAGE.OFFSCREEN_STOP }
  | { readonly type: typeof CAPTURE_MESSAGE.OFFSCREEN_GET_STATE }
  | {
      readonly type: typeof CAPTURE_MESSAGE.OFFSCREEN_STATE_CHANGED;
      readonly state: CaptureState;
    };

export type CaptureResponse =
  | { readonly ok: true; readonly state: CaptureState }
  | {
      readonly ok: false;
      readonly state: CaptureState;
      readonly error: string;
    };

export function createCaptureState(
  phase: CapturePhase,
  options: {
    readonly tabId?: number | null;
    readonly metrics?: CaptureMetrics | null;
    readonly translation?: TranslationSnapshot | null;
    readonly error?: string | null;
    readonly backend?: BackendState;
  } = {},
): CaptureState {
  return {
    phase,
    backend: options.backend ?? createBackendState("disconnected"),
    tabId: options.tabId ?? null,
    metrics: options.metrics ?? null,
    translation: options.translation ?? null,
    error: options.error ?? null,
    updatedAt: Date.now(),
  };
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCapturePhase(value: unknown): value is CapturePhase {
  return (
    value === "ready" ||
    value === "starting" ||
    value === "capturing" ||
    value === "stopping" ||
    value === "error"
  );
}

function isCaptureMetrics(value: unknown): value is CaptureMetrics {
  if (!isRecord(value)) {
    return false;
  }

  const numericKeys: readonly (keyof CaptureMetrics)[] = [
    "sequence",
    "chunkBytes",
    "totalBytes",
    "totalChunks",
    "elapsedMs",
    "intervalMs",
    "averageIntervalMs",
    "jitterMs",
    "averageChunkBytes",
    "bytesPerSecond",
    "sourceSampleRate",
    "targetSampleRate",
    "level",
    "droppedChunks",
    "outOfOrderChunks",
  ];

  return numericKeys.every((key) => typeof value[key] === "number");
}

export function isCaptureState(value: unknown): value is CaptureState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isCapturePhase(value.phase) &&
    isBackendState(value.backend) &&
    (value.tabId === null || typeof value.tabId === "number") &&
    (value.metrics === null || isCaptureMetrics(value.metrics)) &&
    (value.translation === null || isTranslationSnapshot(value.translation)) &&
    (value.error === null || typeof value.error === "string") &&
    typeof value.updatedAt === "number"
  );
}

export function isCaptureRuntimeMessage(
  value: unknown,
): value is CaptureRuntimeMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case CAPTURE_MESSAGE.START:
    case CAPTURE_MESSAGE.STOP:
    case CAPTURE_MESSAGE.GET_STATE:
    case CAPTURE_MESSAGE.OFFSCREEN_STOP:
    case CAPTURE_MESSAGE.OFFSCREEN_GET_STATE:
      return true;
    case CAPTURE_MESSAGE.STATE_CHANGED:
    case CAPTURE_MESSAGE.OFFSCREEN_STATE_CHANGED:
      return isCaptureState(value.state);
    case CAPTURE_MESSAGE.OFFSCREEN_START:
      return (
        typeof value.streamId === "string" &&
        typeof value.tabId === "number" &&
        typeof value.householdCode === "string" &&
        value.householdCode.trim().length > 0
      );
    default:
      return false;
  }
}

export function isCaptureResponse(value: unknown): value is CaptureResponse {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return false;
  }

  if (value.ok) {
    return isCaptureState(value.state);
  }

  return isCaptureState(value.state) && typeof value.error === "string";
}
