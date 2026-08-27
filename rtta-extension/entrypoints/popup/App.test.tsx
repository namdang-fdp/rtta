// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCaptureState } from "../../lib/shared/messages";
import App from "./App";

describe("household code onboarding", () => {
  const values: Record<string, unknown> = {};
  const storageSet = vi.fn(async (entries: Record<string, unknown>) => {
    Object.assign(values, entries);
  });
  const storageRemove = vi.fn(async (key: string) => {
    delete values[key];
  });
  const runtimeSendMessage = vi.fn(async () => ({
    ok: true,
    state: createCaptureState("ready"),
  }));

  beforeEach(() => {
    for (const key of Object.keys(values)) delete values[key];
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: values[key] })),
          set: storageSet,
          remove: storageRemove,
        },
      },
      runtime: {
        sendMessage: runtimeSendMessage,
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows setup when no household code is saved", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Kết nối RTTA" })).toBeTruthy();
    expect(screen.getByLabelText("Mã gia đình")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lưu & kết nối" })).toBeTruthy();
  });

  it("saves locally and returns to the normal capture UI without displaying the code", async () => {
    render(<App />);
    const input = await screen.findByLabelText("Mã gia đình");

    fireEvent.change(input, { target: { value: "shared-household-code" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu & kết nối" }));

    await screen.findByRole("button", { name: "Start Capture" });
    expect(storageSet).toHaveBeenCalledWith({
      rttaHouseholdCode: "shared-household-code",
    });
    expect(screen.queryByText("shared-household-code")).toBeNull();
  });

  it("restores a saved code and clears it from the normal UI", async () => {
    values.rttaHouseholdCode = "stored-household-code";
    render(<App />);

    const clear = await screen.findByRole("button", { name: "Xóa mã đã lưu" });
    expect(screen.queryByText("stored-household-code")).toBeNull();
    fireEvent.click(clear);

    await waitFor(() => {
      expect(storageRemove).toHaveBeenCalledWith("rttaHouseholdCode");
    });
    expect(await screen.findByLabelText("Mã gia đình")).toBeTruthy();
  });
});
