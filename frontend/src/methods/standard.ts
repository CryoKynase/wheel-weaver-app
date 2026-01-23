import { holeOptions } from "../lib/holeOptions";
import type { LacingMethod, PatternResult, SpokePlacement } from "./types";

const tableColumns = [
  "Spoke",
  "Side",
  "Head",
  "Group",
  "Hub hole",
  "Rim hole",
  "Crosses",
];

type StandardParams = {
  crosses: number;
  startSide: "right" | "left";
  laceOrder: "headsOutFirst" | "headsInFirst";
  valveRule: "clearValve" | "alignKeySpokeRightOfValve";
};

const defaultParams: StandardParams = {
  crosses: 3,
  startSide: "right",
  laceOrder: "headsOutFirst",
  valveRule: "clearValve",
};

function resolveParams(params: Record<string, unknown>): StandardParams {
  const crosses =
    typeof params.crosses === "number"
      ? params.crosses
      : Number(params.crosses);
  return {
    crosses: Number.isFinite(crosses) ? crosses : defaultParams.crosses,
    startSide: params.startSide === "left" ? "left" : defaultParams.startSide,
    laceOrder:
      params.laceOrder === "headsInFirst" ? "headsInFirst" : defaultParams.laceOrder,
    valveRule:
      params.valveRule === "alignKeySpokeRightOfValve"
        ? "alignKeySpokeRightOfValve"
        : defaultParams.valveRule,
  };
}

function rotate<T>(values: T[], offset: number) {
  const length = values.length;
  if (length === 0) {
    return values;
  }
  const shift = ((offset % length) + length) % length;
  return values.slice(shift).concat(values.slice(0, shift));
}

function mod(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

function crossesLabel(crosses: number) {
  if (crosses === 0) {
    return "0x radial";
  }
  return `${crosses}x (over ${crosses - 1}, under 1)`;
}

function buildStandardPattern(holes: number, params: StandardParams) {
  if (!Number.isInteger(holes) || holes < 20 || holes % 2 !== 0) {
    throw new Error("holes must be even and >= 20");
  }

  const h = holes / 2;
  const hubRight = Array.from({ length: h }, (_, idx) => idx + 1);
  const hubLeft = Array.from({ length: h }, (_, idx) => idx + 1);

  const splitEven = (values: number[]) => values.filter((_, idx) => idx % 2 === 0);
  const splitOdd = (values: number[]) => values.filter((_, idx) => idx % 2 === 1);

  const sideMap =
    params.startSide === "right"
      ? { start: "right" as const, other: "left" as const }
      : { start: "left" as const, other: "right" as const };

  const groupHead: Record<number, "in" | "out"> = {
    1: params.laceOrder === "headsInFirst" ? "in" : "out",
    2: params.laceOrder === "headsInFirst" ? "in" : "out",
    3: params.laceOrder === "headsInFirst" ? "out" : "in",
    4: params.laceOrder === "headsInFirst" ? "out" : "in",
  };

  const groupSide: Record<number, "right" | "left"> = {
    1: sideMap.start,
    2: sideMap.other,
    3: sideMap.start,
    4: sideMap.other,
  };

  const hubLists: Record<"right" | "left", { out: number[]; in: number[] }> = {
    right: { out: splitEven(hubRight), in: splitOdd(hubRight) },
    left: { out: splitEven(hubLeft), in: splitOdd(hubLeft) },
  };

  const groupOrder =
    params.laceOrder === "headsInFirst" ? [3, 4, 1, 2] : [1, 2, 3, 4];

  // IMPORTANT:
  // Our baseIndex already steps by 2 and preserves rim-hole parity for each side.
  // Therefore tangential offset must be EVEN (full-rim holes) to stay on the same side’s holes.
  const tangentialOffset = 2 * params.crosses; // 3x -> 6

  // Valve shift must also preserve parity; shift by 2 (i.e., one "slot" on that side).
  const rimOffset = params.valveRule === "alignKeySpokeRightOfValve" ? 2 : 0;

  const spokes: SpokePlacement[] = [];
  let spokeIndex = 1;

  for (const group of groupOrder) {
    const side = groupSide[group];
    const head = groupHead[group];
    const hubSequence = hubLists[side][head];

    // right side uses odd holes, left uses even (in 0-based rim index terms)
    const parity: 0 | 1 = side === "right" ? 1 : 0;

    for (const hubHole of hubSequence) {
      // Simplified but stable convention:
      // heads-out spokes act "trailing", heads-in act "leading".
      const isTrailing = head === "out";
      const dir = isTrailing ? 1 : -1;

      // Mirror the left side so the wheel doesn't “twist” the same way on both sides
      const sideFlip = side === "left" ? -1 : 1;

      const signed = dir * sideFlip * tangentialOffset;

      // Base position maps flange hole -> every-other rim hole on that side
      const baseIndex = (hubHole - 1) * 2 + parity + rimOffset;

      const rimIndex = mod(baseIndex + signed, holes);

      spokes.push({
        spokeIndex,
        side,
        head,
        group: group as 1 | 2 | 3 | 4,
        hubHole,
        rimHole: rimIndex + 1, // 1-based for UI
        crosses: params.crosses,
        leadingTrailing: isTrailing ? "trailing" : "leading",
      });

      spokeIndex += 1;
    }
  }

  return spokes;
}


export const standardMethod: LacingMethod = {
  id: "standard",
  name: "Standard (4-step / spoke groups)",
  shortDescription: "Four-group Park-style lacing sequence.",
  supportedHoles: [...holeOptions],
  params: [
    {
      key: "crosses",
      type: "select",
      label: "Crosses",
      default: String(defaultParams.crosses),
      options: [0, 1, 2, 3].map((value) => ({
        value: String(value),
        label: `${value}x`,
      })),
    },
    {
      key: "startSide",
      type: "select",
      label: "Start side",
      default: defaultParams.startSide,
      options: [
        { value: "right", label: "Right" },
        { value: "left", label: "Left" },
      ],
    },
    {
      key: "laceOrder",
      type: "select",
      label: "Lace order",
      default: defaultParams.laceOrder,
      options: [
        { value: "headsOutFirst", label: "Heads out first" },
        { value: "headsInFirst", label: "Heads in first" },
      ],
    },
    {
      key: "valveRule",
      type: "select",
      label: "Valve rule",
      default: defaultParams.valveRule,
      options: [
        { value: "clearValve", label: "Clear valve" },
        {
          value: "alignKeySpokeRightOfValve",
          label: "Align key spoke right of valve",
        },
      ],
    },
  ],
  supportsSteps: true,
  steps: [
    { id: "all", label: "All" },
    { id: "step1", label: "Step 1", groups: [1] },
    { id: "step2", label: "Step 2", groups: [2] },
    { id: "step3", label: "Step 3", groups: [3] },
    { id: "step4", label: "Step 4", groups: [4] },
  ],
  help: {
    title: "Standard method (4-step / spoke groups)",
    sections: [
      {
        heading: "What this method is",
        body:
          "This is a straight-ahead, shop-friendly way to lace by grouping spokes into four repeatable steps. Each step is a predictable set of spokes, so you always know what comes next and can verify the wheel before moving on.",
      },
      {
        heading: "Before you start",
        body:
          "Confirm your hole count, cross count, and which side you want to start on. Sort spokes by heads-in vs heads-out if that helps you stay organized. Keep your nipples ready and thread each spoke a few turns so engagement is consistent.",
      },
      {
        heading: "The four steps (spoke groups)",
        body:
          "There are four spoke groups: start-side heads-out, opposite-side heads-out, start-side heads-in, opposite-side heads-in. The Builder step toggle mirrors those groups so you can focus on one batch at a time.",
      },
      {
        heading: "Valve-hole clearance",
        body:
          "Use a key spoke near the valve to create space for the pump head. The goal is a clean window between spokes at the valve hole. If the valve area looks crowded, revisit your starting side or valve rule and recheck rim indexing.",
      },
      {
        heading: "Crossing and weaving",
        body:
          "Crossing is the repeatable part: each spoke crosses the same number of neighbors before heading to the rim. Weaving should feel consistent within a group. If one spoke seems off, stop and compare it to the previous spoke in the same group.",
      },
      {
        heading: "Checklist before tensioning",
        body:
          "All spokes should be installed, each nipple should have similar thread engagement, and spoke heads should face the intended direction. Spin the wheel to confirm rim hole sequence and that the valve area is clear before you start bringing up tension.",
      },
      {
        heading: "Common mistakes",
        body:
          "Mixing head-in/head-out groups, skipping a rim hole, or swapping sides mid-group are the big ones. Use the Step 1–4 filter to compare your wheel against the table and diagram, and correct issues before they get locked in by tension.",
      },
    ],
  },
  compute: (holes, params): PatternResult => {
    const resolved = resolveParams(params);
    const spokes = buildStandardPattern(holes, resolved);
    const crossesText = crossesLabel(resolved.crosses);

    return {
      version: 1,
      methodId: "standard",
      holes,
      params: resolved,
      spokes,
      table: {
        columns: tableColumns,
        rows: spokes.map((spoke) => ({
          Spoke: `${spoke.side === "right" ? "R" : "L"}-${String(
            spoke.hubHole
          ).padStart(2, "0")}`,
          Side: spoke.side === "right" ? "Right" : "Left",
          Head: spoke.head === "out" ? "Out" : "In",
          Group: spoke.group,
          "Hub hole": spoke.hubHole,
          "Rim hole": spoke.rimHole,
          Crosses: crossesText,
        })),
      },
    };
  },
};
