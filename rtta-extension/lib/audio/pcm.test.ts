import { describe, expect, it } from "vitest";
import {
  calculateRms,
  downmixToMono,
  encodePcmS16Le,
  PCM_BYTES_PER_CHUNK,
  PCM_SAMPLES_PER_CHUNK,
} from "./pcm";

describe("PCM helpers", () => {
  it("defines a 50 ms, 16 kHz, 16-bit chunk", () => {
    expect(PCM_SAMPLES_PER_CHUNK).toBe(800);
    expect(PCM_BYTES_PER_CHUNK).toBe(1_600);
  });

  it("downmixes stereo by averaging channels", () => {
    const mono = downmixToMono([
      Float32Array.from([1, 0.5, -1]),
      Float32Array.from([-1, 0.5, 1]),
    ]);

    expect(Array.from(mono)).toEqual([0, 0.5, 0]);
  });

  it("encodes clamped signed Int16 samples in little-endian order", () => {
    const encoded = encodePcmS16Le(
      Float32Array.from([-2, -1, 0, 1, 2]),
    );
    const bytes = Array.from(new Uint8Array(encoded));

    expect(bytes).toEqual([
      0x00, 0x80, 0x00, 0x80, 0x00, 0x00, 0xff, 0x7f, 0xff, 0x7f,
    ]);
  });

  it("calculates RMS audio level", () => {
    expect(calculateRms(Float32Array.from([1, -1, 1, -1]))).toBe(1);
    expect(calculateRms(new Float32Array(4))).toBe(0);
  });
});
