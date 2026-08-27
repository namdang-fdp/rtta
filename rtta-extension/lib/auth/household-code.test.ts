import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHouseholdCode,
  getHouseholdCode,
  saveHouseholdCode,
} from "./household-code";

describe("household code storage", () => {
  const values: Record<string, unknown> = {};
  const get = vi.fn(async (key: string) => ({ [key]: values[key] }));
  const set = vi.fn(async (entries: Record<string, unknown>) => {
    Object.assign(values, entries);
  });
  const remove = vi.fn(async (key: string) => {
    delete values[key];
  });

  beforeEach(() => {
    for (const key of Object.keys(values)) delete values[key];
    vi.stubGlobal("chrome", { storage: { local: { get, set, remove } } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("saves and restores the normalized household code from local storage", async () => {
    await saveHouseholdCode("  shared-household-code  ");

    expect(set).toHaveBeenCalledWith({
      rttaHouseholdCode: "shared-household-code",
    });
    await expect(getHouseholdCode()).resolves.toBe("shared-household-code");
  });

  it("returns null when no household code is saved", async () => {
    await expect(getHouseholdCode()).resolves.toBeNull();
  });

  it("clears the household code from local storage", async () => {
    await saveHouseholdCode("shared-household-code");
    await clearHouseholdCode();

    expect(remove).toHaveBeenCalledWith("rttaHouseholdCode");
    await expect(getHouseholdCode()).resolves.toBeNull();
  });
});
