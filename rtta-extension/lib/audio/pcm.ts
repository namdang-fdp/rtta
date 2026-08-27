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
  const mono = new Float32Array(frameCountForChannels(channels));
  downmixToMonoInto(channels, mono);
  return mono;
}

/**
 * A non-allocating downmix for AudioWorklet render callbacks.
 *
 * Each channel contributes equally, so a stereo input is averaged rather than
 * summed. This is transport-only and must never be used for tab playback.
 */
export function downmixToMonoInto(
  channels: readonly Float32Array[],
  destination: Float32Array,
): number {
  const frameCount = frameCountForChannels(channels);
  if (destination.length < frameCount) {
    throw new RangeError("The downmix destination is smaller than the input.");
  }

  const channelScale = channels.length === 0 ? 0 : 1 / channels.length;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    let mixedSample = 0;
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
      mixedSample +=
        (channels[channelIndex]?.[frameIndex] ?? 0) * channelScale;
    }
    destination[frameIndex] = mixedSample;
  }

  return frameCount;
}

function frameCountForChannels(channels: readonly Float32Array[]): number {
  if (channels.length === 0) {
    return 0;
  }

  let frameCount = channels[0]?.length ?? 0;
  for (let channelIndex = 1; channelIndex < channels.length; channelIndex += 1) {
    frameCount = Math.min(frameCount, channels[channelIndex]?.length ?? 0);
  }

  return frameCount;
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
