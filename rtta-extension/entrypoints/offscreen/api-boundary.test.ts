import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const unsupportedExtensionApi =
  /\b(?:chrome|browser)\s*\.\s*(?!runtime\b)[A-Za-z_$][\w$]*/u;
const storageAccess =
  /\b(?:chrome|browser)\s*\.\s*storage\b|\bstorage\s*\.\s*local\b|rttaHouseholdCode/u;

describe("restricted extension API contexts", () => {
  it("keeps the offscreen entrypoint limited to chrome.runtime", () => {
    const source = readFileSync(new URL("./main.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(storageAccess);
    expect(source).not.toMatch(unsupportedExtensionApi);
    expect(source).not.toContain("lib/auth/household-code");
  });

  it("keeps the AudioWorklet free of all extension APIs", () => {
    const source = readFileSync(
      new URL("../audio-worklet.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/\b(?:chrome|browser)\s*\./u);
    expect(source).not.toMatch(storageAccess);
  });

  it("makes the worklet output silent while retaining its PCM-only processor", () => {
    const source = readFileSync(
      new URL("../audio-worklet.ts", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/outputChannels\[channelIndex\].*fill\(0\)/u);
    expect(source).toContain("this.port.postMessage(");
    expect(source).not.toMatch(/outputChannel\s*\.\s*(?:set|copyWithin)/u);
  });
});
