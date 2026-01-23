import { holeOptions } from "../lib/holeOptions";
import type { LacingMethod } from "./types";

export const standardMethod: LacingMethod = {
  id: "standard",
  name: "Standard",
  shortDescription: "Four-group Park-style lacing sequence.",
  supportedHoles: [...holeOptions],
  params: [],
  supportsSteps: true,
  steps: [
    { id: "all", label: "All spokes" },
    { id: "step1", label: "Step 1", groups: [1] },
    { id: "step2", label: "Step 2", groups: [2] },
    { id: "step3", label: "Step 3", groups: [3] },
    { id: "step4", label: "Step 4", groups: [4] },
  ],
  compute: () => {
    throw new Error("Standard method compute not implemented.");
  },
};
