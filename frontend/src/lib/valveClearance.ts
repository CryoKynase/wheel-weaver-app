import type { PatternRow } from "./types";

type ValveStatus = {
  status: "clear" | "crowded";
  reason: string;
};

function effectiveStartRimHole(
  holes: number,
  startRimHole: number,
  valveReference: "right_of_valve" | "left_of_valve"
) {
  if (valveReference === "right_of_valve") {
    return startRimHole;
  }
  return ((startRimHole - 2 + holes) % holes) + 1;
}

function wrapHole(holes: number, hole: number) {
  return ((hole - 1 + holes) % holes) + 1;
}

export function evaluateValveClearance(
  rows: PatternRow[],
  holes: number,
  startRimHole: number,
  valveReference: "right_of_valve" | "left_of_valve"
): ValveStatus {
  if (!rows.length) {
    return { status: "clear", reason: "No rows available." };
  }

  const valveRight = effectiveStartRimHole(
    holes,
    startRimHole,
    valveReference
  );
  const valveLeft = wrapHole(holes, valveRight - 1);

  const windowHoles = new Set<number>([
    valveLeft,
    valveRight,
    wrapHole(holes, valveRight + 1),
    wrapHole(holes, valveRight + 2),
    wrapHole(holes, valveLeft - 1),
    wrapHole(holes, valveLeft - 2),
  ]);

  const windowRows = rows.filter((row) => windowHoles.has(row.rimHole));
  const leftRows = rows.filter((row) => row.rimHole === valveLeft);
  const rightRows = rows.filter((row) => row.rimHole === valveRight);

  const leftSides = new Set(leftRows.map((row) => row.side));
  const rightSides = new Set(rightRows.map((row) => row.side));

  if (windowRows.length > 3) {
    return {
      status: "crowded",
      reason: `Many terminations near valve holes ${valveLeft}/${valveRight}.`,
    };
  }

  if (leftSides.has("DS") && leftSides.has("NDS") && rightSides.has("DS") && rightSides.has("NDS")) {
    return {
      status: "crowded",
      reason: `Both sides terminate at valve holes ${valveLeft}/${valveRight}.`,
    };
  }

  return { status: "clear", reason: "Valve area looks clear." };
}
