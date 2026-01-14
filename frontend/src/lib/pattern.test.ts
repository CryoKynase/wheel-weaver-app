import { describe, expect, it } from "vitest";

import { maxCrosses } from "./pattern";

describe("maxCrosses", () => {
  it("caps common hole counts at configured limits", () => {
    expect(maxCrosses(20)).toBe(1);
    expect(maxCrosses(24)).toBe(3);
    expect(maxCrosses(28)).toBe(3);
    expect(maxCrosses(32)).toBe(4);
    expect(maxCrosses(36)).toBe(4);
  });
});
