import {
  calculateRms,
  downmixToMono,
  encodePcmS16Le,
  PCM_SAMPLES_PER_CHUNK,
  PCM_TARGET_SAMPLE_RATE,
  PCM_WORKLET_PROCESSOR_NAME,
} from "../lib/audio/pcm";
import { StreamingResampler } from "../lib/audio/resampler";

interface AudioWorkletProcessorInstance {
  readonly port: MessagePort;
}

declare const AudioWorkletProcessor: {
  new (): AudioWorkletProcessorInstance;
};
declare const currentTime: number;
declare const sampleRate: number;
declare function registerProcessor(
  name: string,
  processor: new () => AudioWorkletProcessorInstance,
): void;

export default defineUnlistedScript(() => {
  class RttaPcmProcessor extends AudioWorkletProcessor {
    private readonly resampler = new StreamingResampler(
      sampleRate,
      PCM_TARGET_SAMPLE_RATE,
    );
    private readonly chunkSamples = new Float32Array(PCM_SAMPLES_PER_CHUNK);
    private chunkOffset = 0;
    private sequence = 0;
    private running = true;

    constructor() {
      super();
      this.port.onmessage = (event: MessageEvent<unknown>) => {
        if (
          typeof event.data === "object" &&
          event.data !== null &&
          "type" in event.data &&
          event.data.type === "stop"
        ) {
          this.running = false;
        }
      };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
      for (const outputChannel of outputs[0] ?? []) {
        outputChannel.fill(0);
      }

      if (!this.running) {
        return false;
      }

      const inputChannels = inputs[0];
      if (inputChannels === undefined || inputChannels.length === 0) {
        return true;
      }

      const monoSamples = downmixToMono(inputChannels);
      const resampledSamples = this.resampler.process(monoSamples);

      for (const sample of resampledSamples) {
        this.chunkSamples[this.chunkOffset] = sample;
        this.chunkOffset += 1;

        if (this.chunkOffset === PCM_SAMPLES_PER_CHUNK) {
          this.emitChunk();
          this.chunkOffset = 0;
        }
      }

      return true;
    }

    private emitChunk(): void {
      const pcm = encodePcmS16Le(this.chunkSamples);
      this.port.postMessage(
        {
          type: "pcm-chunk",
          sequence: this.sequence,
          pcm,
          level: calculateRms(this.chunkSamples),
          emittedAtMs: currentTime * 1_000,
        },
        [pcm],
      );
      this.sequence += 1;
    }
  }

  registerProcessor(PCM_WORKLET_PROCESSOR_NAME, RttaPcmProcessor);
});
