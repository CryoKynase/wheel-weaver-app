export type MethodId = "schraner" | "standard";

export type StepId = "all" | "step1" | "step2" | "step3" | "step4";

export type MethodParamDef =
  | {
      key: string;
      type: "number";
      label: string;
      default: number;
      min?: number;
      max?: number;
      step?: number;
      helperText?: string;
    }
  | {
      key: string;
      type: "select";
      label: string;
      default: string;
      options: { value: string; label: string }[];
      helperText?: string;
    }
  | {
      key: string;
      type: "toggle";
      label: string;
      default: boolean;
      helperText?: string;
    };

export type SpokeSide = "left" | "right";
export type Head = "in" | "out";

export interface SpokePlacement {
  spokeIndex: number;
  side: SpokeSide;
  head: Head;
  group: 1 | 2 | 3 | 4;
  hubHole: number;
  rimHole: number;
  crosses?: number;
  leadingTrailing?: "leading" | "trailing";
}

export interface PatternResult {
  version: number;
  methodId: MethodId;
  holes: number;
  params: Record<string, unknown>;
  spokes: SpokePlacement[];
  table?: {
    columns: string[];
    rows: Record<string, unknown>[];
  };
}

export interface LacingMethod {
  id: MethodId;
  name: string;
  shortDescription: string;
  supportedHoles: number[];
  params: MethodParamDef[];
  supportsSteps?: boolean;
  supportsPhases?: boolean;
  steps?: { id: StepId; label: string; groups?: number[] }[];
  diagramMode?: "classic" | "realistic" | "engineer";
  compute: (holes: number, params: Record<string, unknown>) => PatternResult;
}
