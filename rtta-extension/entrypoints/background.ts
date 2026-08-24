import {
  CAPTURE_MESSAGE,
  createCaptureState,
  errorMessage,
  isCaptureResponse,
  isCaptureRuntimeMessage,
  type CaptureResponse,
  type CaptureRuntimeMessage,
  type CaptureState,
} from "../lib/shared/messages";

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

function isRestrictedTabUrl(url: string | undefined): boolean {
  if (url === undefined) {
    return false;
  }

  return /^(about|chrome|chrome-extension|devtools|edge):/u.test(url);
}

export default defineBackground(() => {
  let captureState = createCaptureState("ready");
  let operationInProgress = false;
  let offscreenCreation: Promise<void> | null = null;

  console.info("[RTTA] Background service worker started.");

  function updateState(state: CaptureState): void {
    captureState = state;
    void broadcastState(state);
  }

  async function broadcastState(state: CaptureState): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: CAPTURE_MESSAGE.STATE_CHANGED,
        state,
      } satisfies CaptureRuntimeMessage);
    } catch {
      // The popup is normally closed; state remains owned by background/offscreen.
    }
  }

  async function hasOffscreenDocument(): Promise<boolean> {
    const documentUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [documentUrl],
    });
    return contexts.length > 0;
  }

  async function ensureOffscreenDocument(): Promise<void> {
    if (await hasOffscreenDocument()) {
      return;
    }

    if (offscreenCreation === null) {
      offscreenCreation = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["USER_MEDIA"],
        justification:
          "Own the user-initiated tab audio stream and process local PCM audio.",
      });
    }

    try {
      await offscreenCreation;
    } finally {
      offscreenCreation = null;
    }
  }

  async function closeOffscreenDocument(): Promise<void> {
    if (offscreenCreation !== null) {
      try {
        await offscreenCreation;
      } catch {
        offscreenCreation = null;
        return;
      }
    }

    if (await hasOffscreenDocument()) {
      await chrome.offscreen.closeDocument();
    }
  }

  async function sendToOffscreen(
    message: CaptureRuntimeMessage,
  ): Promise<CaptureResponse> {
    const response: unknown = await chrome.runtime.sendMessage(message);
    if (!isCaptureResponse(response)) {
      throw new Error("The offscreen audio context returned an invalid response.");
    }
    return response;
  }

  async function synchronizeWithOffscreen(): Promise<CaptureState> {
    if (!(await hasOffscreenDocument())) {
      if (
        captureState.phase === "starting" ||
        captureState.phase === "capturing" ||
        captureState.phase === "stopping"
      ) {
        captureState = createCaptureState("ready");
      }
      return captureState;
    }

    try {
      const response = await sendToOffscreen({
        type: CAPTURE_MESSAGE.OFFSCREEN_GET_STATE,
      });
      captureState = response.state;
    } catch (error) {
      captureState = createCaptureState("error", {
        error: errorMessage(error, "Unable to read the capture state."),
      });
    }

    return captureState;
  }

  async function startCapture(): Promise<CaptureResponse> {
    if (operationInProgress) {
      const message = "A capture operation is already in progress.";
      return { ok: false, state: captureState, error: message };
    }

    operationInProgress = true;

    try {
      const currentState = await synchronizeWithOffscreen();
      if (
        currentState.phase === "starting" ||
        currentState.phase === "capturing" ||
        currentState.phase === "stopping"
      ) {
        const message = "Capture is already running.";
        return { ok: false, state: currentState, error: message };
      }

      updateState(createCaptureState("starting"));

      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (activeTab?.id === undefined) {
        throw new Error("No capturable active tab was found.");
      }
      if (isRestrictedTabUrl(activeTab.url)) {
        throw new Error(
          "Chrome internal pages cannot be captured. Open a normal browser tab and try again.",
        );
      }

      const tabId = activeTab.id;
      updateState(createCaptureState("starting", { tabId }));

      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId,
      });
      if (streamId.length === 0) {
        throw new Error("Chrome did not provide a tab capture stream.");
      }

      await ensureOffscreenDocument();
      const response = await sendToOffscreen({
        type: CAPTURE_MESSAGE.OFFSCREEN_START,
        streamId,
        tabId,
      });
      captureState = response.state;
      void broadcastState(captureState);

      if (!response.ok) {
        await closeOffscreenDocument();
      }

      return response;
    } catch (error) {
      const message = errorMessage(error, "Unable to start tab audio capture.");
      captureState = createCaptureState("error", { error: message });
      void broadcastState(captureState);

      try {
        await closeOffscreenDocument();
      } catch {
        // Keep the original capture error visible in the popup.
      }

      return { ok: false, state: captureState, error: message };
    } finally {
      operationInProgress = false;
    }
  }

  async function stopCapture(): Promise<CaptureResponse> {
    if (operationInProgress) {
      const message = "A capture operation is already in progress.";
      return { ok: false, state: captureState, error: message };
    }

    operationInProgress = true;

    try {
      const offscreenOpen = await hasOffscreenDocument();
      if (!offscreenOpen) {
        captureState = createCaptureState("ready");
        void broadcastState(captureState);
        return { ok: true, state: captureState };
      }

      updateState(
        createCaptureState("stopping", {
          tabId: captureState.tabId,
          metrics: captureState.metrics,
        }),
      );

      const response = await sendToOffscreen({
        type: CAPTURE_MESSAGE.OFFSCREEN_STOP,
      });
      await closeOffscreenDocument();

      captureState = response.ok
        ? createCaptureState("ready")
        : response.state;
      void broadcastState(captureState);
      return response.ok ? { ok: true, state: captureState } : response;
    } catch (error) {
      const message = errorMessage(error, "Unable to stop tab audio capture.");
      captureState = createCaptureState("error", {
        metrics: captureState.metrics,
        error: message,
      });
      void broadcastState(captureState);
      return { ok: false, state: captureState, error: message };
    } finally {
      operationInProgress = false;
    }
  }

  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse) => {
      if (!isCaptureRuntimeMessage(message)) {
        return false;
      }

      switch (message.type) {
        case CAPTURE_MESSAGE.START:
          void startCapture().then(sendResponse);
          return true;
        case CAPTURE_MESSAGE.STOP:
          void stopCapture().then(sendResponse);
          return true;
        case CAPTURE_MESSAGE.GET_STATE:
          void synchronizeWithOffscreen()
            .then((state) => {
              sendResponse({ ok: true, state } satisfies CaptureResponse);
            })
            .catch((error: unknown) => {
              const message = errorMessage(
                error,
                "Unable to read the capture state.",
              );
              const state = createCaptureState("error", { error: message });
              captureState = state;
              sendResponse({
                ok: false,
                state,
                error: message,
              } satisfies CaptureResponse);
            });
          return true;
        case CAPTURE_MESSAGE.OFFSCREEN_STATE_CHANGED:
          captureState = message.state;
          void broadcastState(captureState);
          if (captureState.phase === "error" && !operationInProgress) {
            void closeOffscreenDocument().catch(() => undefined);
          }
          sendResponse({ received: true });
          return false;
        default:
          return false;
      }
    },
  );

});
