import { describe, expect, it } from "vitest";
import { calculateRms } from "./pcm";
import { StreamingResampler } from "./resampler";

function sineWave(
  sampleRate: number,
  frequency: number,
  sampleCount: number,
): Float32Array {
  return Float32Array.from(
    { length: sampleCount },
    (_, index) => Math.sin((2 * Math.PI * frequency * index) / sampleRate),
  );
}

function concatenate(parts: readonly Float32Array[]): Float32Array {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

describe("StreamingResampler", () => {
  it.each([44_100, 48_000, 96_000])(
    "produces exactly 16 kHz worth of samples from %i Hz input",
    (sourceSampleRate) => {
      const resampler = new StreamingResampler(sourceSampleRate, 16_000);
      const output = resampler.process(
        sineWave(sourceSampleRate, 1_000, sourceSampleRate),
      );

      expect(output).toHaveLength(16_000);
    },
  );

  it("preserves output across arbitrary input block boundaries", () => {
    const input = sineWave(48_000, 1_000, 4_800);
    const wholeOutput = new StreamingResampler(48_000, 16_000).process(input);
    const streamingResampler = new StreamingResampler(48_000, 16_000);
    const parts: Float32Array[] = [];

    for (let offset = 0; offset < input.length; offset += 127) {
      parts.push(streamingResampler.process(input.slice(offset, offset + 127)));
    }

    expect(concatenate(parts)).toEqual(wholeOutput);
  });

  it("attenuates frequencies above the target Nyquist limit", () => {
    const lowTone = new StreamingResampler(48_000, 16_000).process(
      sineWave(48_000, 1_000, 48_000),
    );
    const highTone = new StreamingResampler(48_000, 16_000).process(
      sineWave(48_000, 12_000, 48_000),
    );

    const lowToneRms = calculateRms(lowTone.slice(500));
    const highToneRms = calculateRms(highTone.slice(500));
    expect(highToneRms).toBeLessThan(lowToneRms * 0.2);
  });

  it("does not accumulate sample-count drift over five minutes", () => {
    const resampler = new StreamingResampler(48_000, 16_000);
    const renderQuantum = new Float32Array(128);
    let remainingSourceSamples = 48_000 * 60 * 5;
    let outputSampleCount = 0;

    while (remainingSourceSamples > 0) {
      const input =
        remainingSourceSamples >= renderQuantum.length
          ? renderQuantum
          : renderQuantum.slice(0, remainingSourceSamples);
      outputSampleCount += resampler.process(input).length;
      remainingSourceSamples -= input.length;
    }

    expect(outputSampleCount).toBe(16_000 * 60 * 5);
    expect(outputSampleCount / 800).toBe(6_000);
  });
});
