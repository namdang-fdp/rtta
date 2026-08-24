import { describe, expect, it } from "vitest";
import {
  assessBackpressure,
  BACKPRESSURE_ERROR_BYTES,
  BACKPRESSURE_WARNING_BYTES,
} from "./backpressure";

describe("assessBackpressure", () => {
  it("keeps normal realtime buffering healthy", () => {
    expect(assessBackpressure(0)).toEqual({
      level: "healthy",
      bufferedBytes: 0,
    });
    expect(assessBackpressure(BACKPRESSURE_WARNING_BYTES - 1).level).toBe(
      "healthy",
    );
  });

  it("warns at 16 KB and fails at 32 KB", () => {
    expect(assessBackpressure(BACKPRESSURE_WARNING_BYTES).level).toBe(
      "warning",
    );
    expect(assessBackpressure(BACKPRESSURE_ERROR_BYTES - 1).level).toBe(
      "warning",
    );
    expect(assessBackpressure(BACKPRESSURE_ERROR_BYTES).level).toBe("error");
  });

  it("treats invalid browser values as unusable", () => {
    expect(assessBackpressure(Number.NaN).level).toBe("error");
    expect(assessBackpressure(-1).level).toBe("error");
  });
});
