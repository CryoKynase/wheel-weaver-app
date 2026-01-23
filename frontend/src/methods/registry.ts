import type { LacingMethod, MethodId } from "./types";
import { schranerMethod } from "./schraner";
import { standardMethod } from "./standard";

export const METHODS: Record<MethodId, LacingMethod> = {
  schraner: schranerMethod,
  standard: standardMethod,
};

export function getMethod(methodId: MethodId): LacingMethod {
  return METHODS[methodId];
}
