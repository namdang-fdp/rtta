import {
  AudioLines,
  Languages,
  LoaderCircle,
  Play,
  Square,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CAPTURE_MESSAGE,
  createCaptureState,
  errorMessage,
  isCaptureResponse,
  isCaptureRuntimeMessage,
  type CaptureRuntimeMessage,
  type CaptureState,
} from "../../lib/shared/messages";
import type { TranslationSnapshot } from "../../lib/translation/state";

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function phaseLabel(state: CaptureState | null): string {
  switch (state?.phase) {
    case "capturing":
      return "Streaming";
    case "error":
      return "Error";
    case "starting":
      return "Starting";
    case "stopping":
      return "Stopping";
    default:
      return "Ready";
  }
}

function backendLabel(state: CaptureState | null): string {
  switch (state?.backend.phase) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "error":
      return "Error";
    case "stopping":
      return "Stopping";
    default:
      return "Disconnected";
  }
}

function approximateDeliveryOverhead(
  translation: TranslationSnapshot | null,
): number | null {
  if (translation === null) {
    return null;
  }

  const observedAtMs = Date.parse(translation.observedAt);
  const overheadMs = Math.round(translation.receivedAtMs - observedAtMs);
  return Number.isFinite(overheadMs) && overheadMs >= 0 ? overheadMs : null;
}

function App() {
  const [captureState, setCaptureState] = useState<CaptureState | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    let mounted = true;

    const handleMessage = (message: unknown): void => {
      if (
        mounted &&
        isCaptureRuntimeMessage(message) &&
        message.type === CAPTURE_MESSAGE.STATE_CHANGED
      ) {
        setCaptureState(message.state);
        setClock(Date.now());
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    void (async () => {
      try {
        const response: unknown = await chrome.runtime.sendMessage({
          type: CAPTURE_MESSAGE.GET_STATE,
        } satisfies CaptureRuntimeMessage);

        if (!isCaptureResponse(response)) {
          throw new Error("The background returned an invalid capture state.");
        }
        if (mounted) {
          setCaptureState(response.state);
          setClock(Date.now());
        }
      } catch (error) {
        if (mounted) {
          setCaptureState(
            createCaptureState("error", {
              error: errorMessage(error, "Unable to load capture state."),
            }),
          );
        }
      }
    })();

    return () => {
      mounted = false;
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  useEffect(() => {
    if (captureState?.phase !== "capturing") {
      return;
    }

    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [captureState?.phase]);

  const metrics = captureState?.metrics ?? null;
  const elapsedMs = useMemo(() => {
    if (metrics === null || captureState === null) {
      return 0;
    }

    const liveOffset =
      captureState.phase === "capturing"
        ? Math.max(0, clock - captureState.updatedAt)
        : 0;
    return metrics.elapsedMs + liveOffset;
  }, [captureState, clock, metrics]);

  const capturing = captureState?.phase === "capturing";
  const transitioning =
    captureState?.phase === "starting" || captureState?.phase === "stopping";
  const buttonDisabled = captureState === null || commandPending || transitioning;
  const levelPercent = Math.min(100, (metrics?.level ?? 0) * 400);
  const backendConnected = captureState?.backend.phase === "connected";
  const translation = captureState?.translation ?? null;
  const deliveryOverheadMs = approximateDeliveryOverhead(translation);

  async function sendCommand(
    type: typeof CAPTURE_MESSAGE.START | typeof CAPTURE_MESSAGE.STOP,
  ): Promise<void> {
    setCommandPending(true);

    try {
      const response: unknown = await chrome.runtime.sendMessage({ type });
      if (!isCaptureResponse(response)) {
        throw new Error("The background returned an invalid capture response.");
      }
      setCaptureState(response.state);
      setClock(Date.now());
    } catch (error) {
      setCaptureState(
        createCaptureState("error", {
          metrics,
          translation: captureState?.translation,
          error: errorMessage(error, "The capture command failed."),
        }),
      );
    } finally {
      setCommandPending(false);
    }
  }

  const statusTone =
    captureState?.phase === "error"
      ? "bg-rose-500"
      : capturing
        ? "bg-emerald-500"
        : transitioning
          ? "bg-amber-400"
          : "bg-pink-400";

  return (
    <main className="w-80 bg-pink-50 p-5 text-pink-950">
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-pink-200 text-pink-700">
          <Languages aria-hidden="true" size={22} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">RTTA</h1>
          <p className="text-xs text-pink-700">Local tab audio streaming</p>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-pink-200 bg-white/85 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Capture</span>
          <span
            className="inline-flex items-center gap-2 text-sm text-pink-700"
            aria-live="polite"
          >
            <span className={`size-2 rounded-full ${statusTone}`} aria-hidden="true" />
            {phaseLabel(captureState)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl bg-pink-50 px-3 py-2 text-xs">
          <span className="text-pink-600">Backend</span>
          <span className="flex items-center gap-2 font-medium text-pink-800">
            <span
              className={`size-2 rounded-full ${
                captureState?.backend.phase === "error"
                  ? "bg-rose-500"
                  : backendConnected
                    ? "bg-emerald-500"
                    : captureState?.backend.phase === "connecting" ||
                        captureState?.backend.phase === "stopping"
                      ? "bg-amber-400"
                      : "bg-pink-300"
              }`}
              aria-hidden="true"
            />
            {backendLabel(captureState)}
            {backendConnected ? (
              <span className="font-normal tabular-nums text-pink-600">
                {(captureState.backend.bufferedBytes / 1_000).toFixed(1)} KB
              </span>
            ) : null}
          </span>
        </div>

        {captureState?.phase === "error" && captureState.error !== null ? (
          <div className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">
            <TriangleAlert className="mt-0.5 shrink-0" aria-hidden="true" size={15} />
            <span>{captureState.error}</span>
          </div>
        ) : null}

        {capturing && metrics !== null ? (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <AudioLines aria-hidden="true" size={16} className="text-pink-600" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-pink-500 transition-[width] duration-150"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-pink-700">
                {metrics.level.toFixed(3)}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-pink-50 p-2.5">
                <dt className="text-pink-600">Elapsed</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {formatElapsed(elapsedMs)}
                </dd>
              </div>
              <div className="rounded-xl bg-pink-50 p-2.5">
                <dt className="text-pink-600">PCM rate</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {(metrics.bytesPerSecond / 1_000).toFixed(1)} KB/s
                </dd>
              </div>
              <div className="rounded-xl bg-pink-50 p-2.5">
                <dt className="text-pink-600">Avg chunk</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {Math.round(metrics.averageChunkBytes)} B
                </dd>
              </div>
              <div className="rounded-xl bg-pink-50 p-2.5">
                <dt className="text-pink-600">Interval / jitter</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {metrics.averageIntervalMs.toFixed(1)} / {metrics.jitterMs.toFixed(1)} ms
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-pink-100 px-3 py-2 text-center text-xs font-medium text-pink-700">
            16 kHz · mono · signed 16-bit PCM · raw WebSocket
          </div>
        )}

        <button
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-55"
          type="button"
          disabled={buttonDisabled}
          onClick={() =>
            void sendCommand(
              capturing ? CAPTURE_MESSAGE.STOP : CAPTURE_MESSAGE.START,
            )
          }
        >
          {commandPending || transitioning ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" size={16} />
          ) : capturing ? (
            <Square aria-hidden="true" size={15} fill="currentColor" />
          ) : (
            <Play aria-hidden="true" size={16} fill="currentColor" />
          )}
          {captureState?.phase === "starting"
            ? "Starting…"
            : captureState?.phase === "stopping"
              ? "Stopping…"
              : capturing
                ? "Stop Capture"
                : "Start Capture"}
        </button>
      </section>

      <section className="mt-3 rounded-2xl border border-pink-200 bg-white/85 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Translation</h2>
          {translation !== null ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                translation.eventType === "FINAL"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {translation.eventType}
            </span>
          ) : null}
        </div>

        {translation === null ? (
          <p className="mt-3 rounded-xl bg-pink-50 px-3 py-3 text-xs leading-relaxed text-pink-600">
            {capturing
              ? "Waiting for Azure translation…"
              : "Start capture to receive realtime EN / VI."}
          </p>
        ) : (
          <div className="mt-3 space-y-3" aria-live="polite">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-pink-500">
                EN
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-pink-800">
                {translation.sourceText || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-pink-100/80 p-3">
              <p className="text-[10px] font-bold tracking-wider text-pink-600">
                VI
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-base font-semibold leading-relaxed text-pink-950">
                {translation.translatedText || "—"}
              </p>
            </div>
            {deliveryOverheadMs !== null ? (
              <p
                className="text-[10px] tabular-nums text-pink-500"
                title="Approximate same-machine wall-clock time from server observation to extension receipt"
              >
                Local delivery ~{deliveryOverheadMs} ms
              </p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
