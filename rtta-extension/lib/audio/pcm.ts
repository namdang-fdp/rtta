export const PCM_TARGET_SAMPLE_RATE = 16_000;
export const PCM_CHUNK_DURATION_MS = 50;
export const PCM_SAMPLES_PER_CHUNK =
  (PCM_TARGET_SAMPLE_RATE * PCM_CHUNK_DURATION_MS) / 1_000;
export const PCM_BYTES_PER_SAMPLE = 2;
export const PCM_BYTES_PER_CHUNK =
  PCM_SAMPLES_PER_CHUNK * PCM_BYTES_PER_SAMPLE;
export const PCM_WORKLET_PROCESSOR_NAME = "rtta-pcm-processor";

export function downmixToMono(
  channels: readonly Float32Array[],
): Float32Array {
  if (channels.length === 0) {
    return new Float32Array(0);
  }

  let frameCount = channels[0]?.length ?? 0;
  for (let channelIndex = 1; channelIndex < channels.length; channelIndex += 1) {
    frameCount = Math.min(frameCount, channels[channelIndex]?.length ?? 0);
  }

  const mono = new Float32Array(frameCount);
  const channelScale = 1 / channels.length;

  for (const channel of channels) {
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      mono[frameIndex] =
        (mono[frameIndex] ?? 0) +
        (channel[frameIndex] ?? 0) * channelScale;
    }
  }

  return mono;
}

export function floatSampleToInt16(sample: number): number {
  const clampedSample = Math.max(-1, Math.min(1, sample));
  const scale = clampedSample < 0 ? 0x8000 : 0x7fff;
  return Math.round(clampedSample * scale);
}

export function encodePcmS16Le(samples: Float32Array): ArrayBuffer {
  const pcmBuffer = new ArrayBuffer(samples.length * PCM_BYTES_PER_SAMPLE);
  const pcmView = new DataView(pcmBuffer);

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    pcmView.setInt16(
      sampleIndex * PCM_BYTES_PER_SAMPLE,
      floatSampleToInt16(samples[sampleIndex] ?? 0),
      true,
    );
  }

  return pcmBuffer;
}

export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumOfSquares = 0;
  for (const sample of samples) {
    sumOfSquares += sample * sample;
  }

  return Math.sqrt(sumOfSquares / samples.length);
}
