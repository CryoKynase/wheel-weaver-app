import { defaultPatternRequest } from "../lib/defaults";
import type { LacingMethod, MethodId, StepId } from "./types";
import { schranerMethod } from "./schraner";
import { standardMethod } from "./standard";

export const METHODS: Record<MethodId, LacingMethod> = {
  schraner: schranerMethod,
  standard: standardMethod,
};

export function getMethod(methodId: MethodId): LacingMethod {
  return METHODS[methodId];
}

export function normalizeMethodId(input: string | null | undefined): MethodId {
  return input === "standard" ? "standard" : "schraner";
}

export function normalizeHolesForMethod(
  methodId: MethodId,
  holes: number
): number {
  const method = getMethod(methodId);
  const supported = method.supportedHoles;
  const fallback = defaultPatternRequest.holes;
  const candidate = Number.isFinite(holes) ? holes : fallback;
  if (!supported.length) {
    return fallback;
  }
  if (supported.includes(candidate)) {
    return candidate;
  }
  let nearest = supported[0];
  let bestDelta = Math.abs(candidate - nearest);
  for (const value of supported) {
    const delta = Math.abs(candidate - value);
    if (delta < bestDelta) {
      nearest = value;
      bestDelta = delta;
    }
  }
  return nearest;
}

export function groupsForStep(step: StepId): number[] | "all" {
  switch (step) {
    case "step1":
      return [1];
    case "step2":
      return [2];
    case "step3":
      return [3];
    case "step4":
      return [4];
    default:
      return "all";
  }
}
