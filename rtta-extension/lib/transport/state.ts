export type BackendPhase =
  | "disconnected"
  | "connecting"
  | "connected"
  | "stopping"
  | "error";

export interface BackendState {
  readonly phase: BackendPhase;
  readonly bufferedBytes: number;
}

export function createBackendState(
  phase: BackendPhase,
  bufferedBytes = 0,
): BackendState {
  return {
    phase,
    bufferedBytes: Math.max(0, bufferedBytes),
  };
}

export function isBackendState(value: unknown): value is BackendState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.phase === "disconnected" ||
      candidate.phase === "connecting" ||
      candidate.phase === "connected" ||
      candidate.phase === "stopping" ||
      candidate.phase === "error") &&
    typeof candidate.bufferedBytes === "number" &&
    Number.isFinite(candidate.bufferedBytes) &&
    candidate.bufferedBytes >= 0
  );
}
