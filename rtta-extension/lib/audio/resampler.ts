interface BiquadCoefficients {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

class BiquadLowPass {
  private inputDelay1 = 0;
  private inputDelay2 = 0;
  private outputDelay1 = 0;
  private outputDelay2 = 0;

  constructor(private readonly coefficients: BiquadCoefficients) {}

  process(sample: number): number {
    const { a1, a2, b0, b1, b2 } = this.coefficients;
    const output =
      b0 * sample +
      b1 * this.inputDelay1 +
      b2 * this.inputDelay2 -
      a1 * this.outputDelay1 -
      a2 * this.outputDelay2;

    this.inputDelay2 = this.inputDelay1;
    this.inputDelay1 = sample;
    this.outputDelay2 = this.outputDelay1;
    this.outputDelay1 = output;

    return output;
  }

  reset(): void {
    this.inputDelay1 = 0;
    this.inputDelay2 = 0;
    this.outputDelay1 = 0;
    this.outputDelay2 = 0;
  }
}

function createLowPassCoefficients(
  sampleRate: number,
  cutoffFrequency: number,
  qualityFactor: number,
): BiquadCoefficients {
  const angularFrequency = (2 * Math.PI * cutoffFrequency) / sampleRate;
  const cosine = Math.cos(angularFrequency);
  const sine = Math.sin(angularFrequency);
  const alpha = sine / (2 * qualityFactor);
  const normalization = 1 / (1 + alpha);

  return {
    b0: ((1 - cosine) / 2) * normalization,
    b1: (1 - cosine) * normalization,
    b2: ((1 - cosine) / 2) * normalization,
    a1: -2 * cosine * normalization,
    a2: (1 - alpha) * normalization,
  };
}

/**
 * Stateful resampler for arbitrary render-quantum boundaries.
 *
 * Downsampling is preceded by a fourth-order Butterworth-style low-pass filter
 * to reduce aliasing. Linear interpolation then places output samples on a
 * continuous source timeline, so chunk boundaries do not introduce drift.
 */
export class StreamingResampler {
  private readonly sourceSamplesPerOutputSample: number;
  private readonly lowPassStages: readonly BiquadLowPass[];
  private processedSourceSamples = 0;
  private producedOutputSamples = 0;
  private previousSample = 0;
  private hasPreviousSample = false;

  constructor(
    readonly sourceSampleRate: number,
    readonly targetSampleRate: number,
  ) {
    if (!Number.isFinite(sourceSampleRate) || sourceSampleRate <= 0) {
      throw new RangeError("Source sample rate must be a positive number.");
    }
    if (!Number.isFinite(targetSampleRate) || targetSampleRate <= 0) {
      throw new RangeError("Target sample rate must be a positive number.");
    }

    this.sourceSamplesPerOutputSample = sourceSampleRate / targetSampleRate;

    if (sourceSampleRate > targetSampleRate) {
      const cutoffFrequency = targetSampleRate * 0.45;
      this.lowPassStages = [
        new BiquadLowPass(
          createLowPassCoefficients(sourceSampleRate, cutoffFrequency, 0.5411961),
        ),
        new BiquadLowPass(
          createLowPassCoefficients(sourceSampleRate, cutoffFrequency, 1.306563),
        ),
      ];
    } else {
      this.lowPassStages = [];
    }
  }

  process(input: Float32Array): Float32Array {
    const output = new Float32Array(
      this.maxOutputSamplesForInputFrames(input.length),
    );
    const outputLength = this.processInto(input, output);
    return output.slice(0, outputLength);
  }

  /**
   * Resample into a caller-owned buffer. AudioWorklet callers reuse this buffer
   * on every render quantum, avoiding garbage collection on the audio thread.
   */
  processInto(
    input: Float32Array,
    output: Float32Array,
    inputLength = input.length,
  ): number {
    if (inputLength < 0 || inputLength > input.length) {
      throw new RangeError("The requested input length is outside the input buffer.");
    }

    let outputLength = 0;

    for (let inputIndex = 0; inputIndex < inputLength; inputIndex += 1) {
      const inputSample = input[inputIndex] ?? 0;
      let filteredSample = inputSample;
      for (const lowPassStage of this.lowPassStages) {
        filteredSample = lowPassStage.process(filteredSample);
      }

      const currentSourcePosition = this.processedSourceSamples;

      if (!this.hasPreviousSample) {
        this.previousSample = filteredSample;
        this.hasPreviousSample = true;

        if (this.producedOutputSamples === 0) {
          this.writeSample(output, outputLength, filteredSample);
          outputLength += 1;
          this.producedOutputSamples += 1;
        }
      } else {
        const segmentStart = currentSourcePosition - 1;
        let nextOutputPosition =
          this.producedOutputSamples * this.sourceSamplesPerOutputSample;

        while (nextOutputPosition <= currentSourcePosition + 1e-7) {
          const interpolationPosition = Math.max(
            0,
            Math.min(1, nextOutputPosition - segmentStart),
          );
          this.writeSample(
            output,
            outputLength,
            this.previousSample +
              (filteredSample - this.previousSample) * interpolationPosition,
          );
          outputLength += 1;
          this.producedOutputSamples += 1;
          nextOutputPosition =
            this.producedOutputSamples * this.sourceSamplesPerOutputSample;
        }

        this.previousSample = filteredSample;
      }

      this.processedSourceSamples += 1;
    }

    return outputLength;
  }

  maxOutputSamplesForInputFrames(inputFrames: number): number {
    return Math.max(
      1,
      Math.ceil((inputFrames * this.targetSampleRate) / this.sourceSampleRate) +
        2,
    );
  }

  reset(): void {
    this.processedSourceSamples = 0;
    this.producedOutputSamples = 0;
    this.previousSample = 0;
    this.hasPreviousSample = false;
    for (const lowPassStage of this.lowPassStages) {
      lowPassStage.reset();
    }
  }

  private writeSample(
    output: Float32Array,
    outputIndex: number,
    sample: number,
  ): void {
    if (outputIndex >= output.length) {
      throw new RangeError("The resample destination is smaller than required.");
    }
    output[outputIndex] = sample;
  }
}
