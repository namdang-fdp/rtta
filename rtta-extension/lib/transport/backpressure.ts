export const BACKPRESSURE_WARNING_BYTES = 16_000;
export const BACKPRESSURE_ERROR_BYTES = 32_000;

export type BackpressureLevel = "healthy" | "warning" | "error";

export interface BackpressureAssessment {
  readonly level: BackpressureLevel;
  readonly bufferedBytes: number;
}

export function assessBackpressure(
  bufferedAmount: number,
): BackpressureAssessment {
  if (!Number.isFinite(bufferedAmount) || bufferedAmount < 0) {
    return { level: "error", bufferedBytes: 0 };
  }

  if (bufferedAmount >= BACKPRESSURE_ERROR_BYTES) {
    return { level: "error", bufferedBytes: bufferedAmount };
  }
  if (bufferedAmount >= BACKPRESSURE_WARNING_BYTES) {
    return { level: "warning", bufferedBytes: bufferedAmount };
  }
  return { level: "healthy", bufferedBytes: bufferedAmount };
}
