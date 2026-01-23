import { defaultPatternRequest } from "../lib/defaults";
import { holeOptions } from "../lib/holeOptions";
import { maxCrosses } from "../lib/pattern";
import type { LacingMethod, PatternResult } from "./types";

const tableColumns = [
  "spoke",
  "order",
  "step",
  "side",
  "oddEvenSet",
  "k",
  "hubHole",
  "heads",
  "rimHole",
  "crossesDescribed",
  "notes",
];

type SchranerParams = {
  wheelType: "rear" | "front";
  crosses: number;
  symmetry: "symmetrical" | "asymmetrical";
  invertHeads: boolean;
  startRimHole: number;
  valveReference: "right_of_valve" | "left_of_valve";
  startHubHoleDS: number;
  startHubHoleNDS: number;
};

type SchranerRow = {
  spoke: string;
  order: number;
  step: string;
  side: "DS" | "NDS";
  oddEvenSet: "Odd" | "Even";
  k: number;
  hubHole: number;
  heads: "IN" | "OUT";
  rimHole: number;
  crossesDescribed: string;
  notes: string;
};

function mod(value: number, base: number) {
  return ((value % base) + base) % base;
}

function resolveNumber(value: unknown, fallback: number) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function resolveBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function resolveString<T extends string>(
  value: unknown,
  fallback: T,
  options: readonly T[]
) {
  return options.includes(value as T) ? (value as T) : fallback;
}

function resolveParams(params: Record<string, unknown>): SchranerParams {
  return {
    wheelType: resolveString(
      params.wheelType,
      defaultPatternRequest.wheelType,
      ["rear", "front"]
    ),
    crosses: resolveNumber(params.crosses, defaultPatternRequest.crosses),
    symmetry: resolveString(
      params.symmetry,
      defaultPatternRequest.symmetry,
      ["symmetrical", "asymmetrical"]
    ),
    invertHeads: resolveBoolean(
      params.invertHeads,
      defaultPatternRequest.invertHeads
    ),
    startRimHole: resolveNumber(
      params.startRimHole,
      defaultPatternRequest.startRimHole
    ),
    valveReference: resolveString(
      params.valveReference,
      defaultPatternRequest.valveReference,
      ["right_of_valve", "left_of_valve"]
    ),
    startHubHoleDS: resolveNumber(
      params.startHubHoleDS,
      defaultPatternRequest.startHubHoleDS
    ),
    startHubHoleNDS: resolveNumber(
      params.startHubHoleNDS,
      defaultPatternRequest.startHubHoleNDS
    ),
  };
}

function validateInputs(holes: number, crosses: number) {
  if (!Number.isInteger(holes) || holes < 20 || holes % 2 !== 0) {
    throw new Error("holes must be even and >= 20");
  }
  const max = maxCrosses(holes);
  if (crosses < 0 || crosses > max) {
    throw new Error("crosses exceeds maximum for hole count");
  }
}

function effectiveStartRimHole(
  holes: number,
  startRimHole: number,
  valveReference: SchranerParams["valveReference"]
) {
  if (valveReference === "right_of_valve") {
    return mod(startRimHole - 2, holes) + 1;
  }
  return startRimHole;
}

function rimHoleForK(
  holes: number,
  effectiveStart: number,
  side: "DS" | "NDS",
  k: number
) {
  const offset = side === "DS" ? 2 * (k - 1) : 1 + 2 * (k - 1);
  return mod(effectiveStart - 1 + offset, holes) + 1;
}

function physicalHubHole(hubHoleIndex: number, startHubHole: number, h: number) {
  return mod(hubHoleIndex - 1 + (startHubHole - 1), h) + 1;
}

function headsForSet(invertHeads: boolean, oddEvenSet: "Odd" | "Even") {
  let oddHeads: "IN" | "OUT" = "OUT";
  let evenHeads: "IN" | "OUT" = "IN";
  if (invertHeads) {
    [oddHeads, evenHeads] = [evenHeads, oddHeads];
  }
  return oddEvenSet === "Odd" ? oddHeads : evenHeads;
}

function crossesDescribed(crosses: number) {
  if (crosses === 0) {
    return "0x radial";
  }
  return `${crosses}x (over ${crosses - 1}, under 1)`;
}

function oddEvenSet(hubHoleIndex: number): "Odd" | "Even" {
  return hubHoleIndex % 2 === 1 ? "Odd" : "Even";
}

function kForHubHole(
  hubHoleIndex: number,
  crosses: number,
  side: "DS" | "NDS",
  h: number
) {
  if (hubHoleIndex % 2 === 1) {
    return hubHoleIndex;
  }
  if (side === "DS") {
    return mod(hubHoleIndex - 1 - 2 * crosses, h) + 1;
  }
  return mod(hubHoleIndex - 1 + 2 * crosses, h) + 1;
}

function computeSchraner(holes: number, params: SchranerParams) {
  const h = holes / 2;
  const effectiveStart = effectiveStartRimHole(
    holes,
    params.startRimHole,
    params.valveReference
  );
  const crossesDesc = crossesDescribed(params.crosses);
  const asymNote =
    params.symmetry === "asymmetrical"
      ? "Asymmetrical build selected (heads unchanged in v1)"
      : null;

  const rows: SchranerRow[] = [];
  let orderCounter = 1;

  const makeRow = (
    side: "DS" | "NDS",
    hubHoleIndex: number,
    step: string,
    notes: string
  ): SchranerRow => {
    const oddEven = oddEvenSet(hubHoleIndex);
    const k = kForHubHole(hubHoleIndex, params.crosses, side, h);
    const rimHole = rimHoleForK(holes, effectiveStart, side, k);
    const physical =
      side === "DS"
        ? physicalHubHole(hubHoleIndex, params.startHubHoleDS, h)
        : physicalHubHole(hubHoleIndex, params.startHubHoleNDS, h);
    const heads = headsForSet(params.invertHeads, oddEven);
    const combinedNotes = asymNote ? `${notes}. ${asymNote}` : notes;
    return {
      spoke: `${side}-${String(physical).padStart(2, "0")}`,
      order: orderCounter,
      step,
      side,
      oddEvenSet: oddEven,
      k,
      hubHole: physical,
      heads,
      rimHole,
      crossesDescribed: crossesDesc,
      notes: combinedNotes,
    };
  };

  const addRows = (
    side: "DS" | "NDS",
    hubIndices: number[],
    step: string,
    notes: string
  ) => {
    hubIndices.forEach((idx) => {
      rows.push(makeRow(side, idx, step, notes));
      orderCounter += 1;
    });
  };

  rows.push(
    makeRow("DS", 1, "R1", "Reference at valve (valve-left)")
  );
  orderCounter += 1;

  let secondRefIdx = params.crosses === 0 ? 2 : 2 * params.crosses + 2;
  secondRefIdx = mod(secondRefIdx - 1, h) + 1;
  rows.push(
    makeRow("DS", secondRefIdx, "R1", "Second reference at valve (valve-right)")
  );
  orderCounter += 1;

  const oddIndices = Array.from({ length: h }, (_, idx) => idx + 1).filter(
    (idx) => idx % 2 === 1
  );
  const evenIndices = Array.from({ length: h }, (_, idx) => idx + 1).filter(
    (idx) => idx % 2 === 0
  );
  const remainingOdd = oddIndices.filter((idx) => idx !== 1);
  const remainingEven = evenIndices.filter((idx) => idx !== secondRefIdx);

  addRows("DS", remainingOdd, "R2", "Odd set fill");
  addRows("DS", remainingEven, "R3", "Even set weave");

  rows.push(
    makeRow("NDS", 1, "L1", "NDS start reference (valve-right)")
  );
  orderCounter += 1;
  rows.push(
    makeRow("NDS", secondRefIdx, "L1", "Second reference (valve-left)")
  );
  orderCounter += 1;

  const remainingNdsOdd = oddIndices.filter((idx) => idx !== 1);
  const remainingNdsEven = evenIndices.filter((idx) => idx !== secondRefIdx);
  addRows("NDS", remainingNdsOdd, "L3", "Odd set fill");
  addRows("NDS", remainingNdsEven, "L4", "Even set weave");

  return rows;
}

export const schranerMethod: LacingMethod = {
  id: "schraner",
  name: "Schraner",
  shortDescription: "Workshop-style lacing sequence anchored at the valve.",
  supportedHoles: [...holeOptions],
  params: [
    {
      key: "wheelType",
      type: "select",
      label: "Wheel type",
      default: defaultPatternRequest.wheelType,
      options: [
        { value: "rear", label: "Rear" },
        { value: "front", label: "Front" },
      ],
    },
    {
      key: "crosses",
      type: "number",
      label: "Crosses",
      default: defaultPatternRequest.crosses,
      min: 0,
      step: 1,
    },
    {
      key: "symmetry",
      type: "select",
      label: "Symmetry",
      default: defaultPatternRequest.symmetry,
      options: [
        { value: "symmetrical", label: "Symmetrical" },
        { value: "asymmetrical", label: "Asymmetrical" },
      ],
    },
    {
      key: "invertHeads",
      type: "toggle",
      label: "Invert heads",
      default: defaultPatternRequest.invertHeads,
    },
    {
      key: "startRimHole",
      type: "number",
      label: "Start rim hole",
      default: defaultPatternRequest.startRimHole,
      min: 1,
      step: 1,
    },
    {
      key: "valveReference",
      type: "select",
      label: "Valve reference",
      default: defaultPatternRequest.valveReference,
      options: [
        { value: "right_of_valve", label: "Right of valve" },
        { value: "left_of_valve", label: "Left of valve" },
      ],
    },
    {
      key: "startHubHoleDS",
      type: "number",
      label: "Start hub hole (DS)",
      default: defaultPatternRequest.startHubHoleDS,
      min: 1,
      step: 1,
    },
    {
      key: "startHubHoleNDS",
      type: "number",
      label: "Start hub hole (NDS)",
      default: defaultPatternRequest.startHubHoleNDS,
      min: 1,
      step: 1,
    },
  ],
  compute: (holes, params): PatternResult => {
    const resolved = resolveParams(params);
    validateInputs(holes, resolved.crosses);
    const rows = computeSchraner(holes, resolved);

    const spokes = rows.map((row) => ({
      spokeIndex: row.order,
      side: row.side === "DS" ? "right" : "left",
      head: row.heads === "IN" ? "in" : "out",
      group: 1,
      hubHole: row.hubHole,
      rimHole: row.rimHole,
      crosses: resolved.crosses,
    }));

    return {
      version: 1,
      methodId: "schraner",
      holes,
      params: resolved,
      spokes,
      table: {
        columns: tableColumns,
        rows: rows.map((row) => ({ ...row })),
      },
    };
  },
};
