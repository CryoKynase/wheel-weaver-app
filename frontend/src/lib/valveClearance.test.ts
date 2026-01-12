import { describe, expect, it } from "vitest";

import { evaluateValveClearance } from "./valveClearance";

const baseRows = [
  { rimHole: 32, side: "DS" },
  { rimHole: 1, side: "DS" },
  { rimHole: 2, side: "NDS" },
].map((row, idx) => ({
  spoke: `S${idx}`,
  order: idx + 1,
  step: "R1",
  side: row.side as "DS" | "NDS",
  oddEvenSet: "Odd" as const,
  k: 1,
  hubHole: 1,
  heads: "OUT" as const,
  rimHole: row.rimHole,
  crossesDescribed: "3x",
  notes: "",
}));

describe("evaluateValveClearance", () => {
  it("reports clear when few terminations near valve", () => {
    const result = evaluateValveClearance(baseRows, 32, 1, "right_of_valve");
    expect(result.status).toBe("clear");
  });

  it("reports crowded when many terminations near valve", () => {
    const crowdedRows = [
      ...baseRows,
      { ...baseRows[0], rimHole: 31 },
      { ...baseRows[0], rimHole: 30 },
    ];
    const result = evaluateValveClearance(crowdedRows, 32, 1, "right_of_valve");
    expect(result.status).toBe("crowded");
  });
});
