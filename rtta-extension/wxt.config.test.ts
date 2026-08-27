import { describe, expect, it } from "vitest";
import config from "./wxt.config";

describe("production extension manifest configuration", () => {
  it("builds Manifest V3 with local storage permission", () => {
    expect(config.manifestVersion).toBe(3);
    expect(config.manifest).toMatchObject({
      permissions: expect.arrayContaining(["storage"]),
    });
  });
});
