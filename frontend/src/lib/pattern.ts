import type { PatternRequest } from "./types";

export function maxCrosses(holes: number) {
  if (holes === 20) {
    return 1;
  }
  if (holes === 24 || holes === 28) {
    return 3;
  }
  if (holes === 32 || holes === 36) {
    return 4;
  }
  const h = holes / 2;
  return Math.floor((h - 2) / 2);
}

export function normalizeParamsForHoles(
  params: PatternRequest,
  holes: number
): PatternRequest {
  const h = holes / 2;
  const maxCross = maxCrosses(holes);
  return {
    ...params,
    holes,
    crosses: Math.min(params.crosses, maxCross),
    startRimHole: Math.min(params.startRimHole, holes),
    startHubHoleDS: Math.min(params.startHubHoleDS, h),
    startHubHoleNDS: Math.min(params.startHubHoleNDS, h),
  };
}

export function effectiveStartRimHole(
  holes: number,
  startRimHole: number,
  valveReference: PatternRequest["valveReference"]
) {
  if (valveReference === "right_of_valve") {
    return startRimHole;
  }
  return ((startRimHole - 2 + holes) % holes) + 1;
}
