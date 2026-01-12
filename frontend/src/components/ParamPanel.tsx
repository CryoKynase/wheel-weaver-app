import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { defaultPatternRequest } from "../lib/defaults";
import type { PatternRequest } from "../lib/types";

const holeOptions = [20, 24, 28, 32, 36];

const schema = z.object({
  holes: z.number().min(20).refine((val) => val % 2 === 0, "Must be even"),
  wheelType: z.enum(["rear", "front"]),
  crosses: z.number().min(0),
  symmetry: z.enum(["symmetrical", "asymmetrical"]),
  invertHeads: z.boolean(),
  startRimHole: z.number().min(1),
  valveReference: z.enum(["right_of_valve", "left_of_valve"]),
  startHubHoleDS: z.number().min(1),
  startHubHoleNDS: z.number().min(1),
});

function maxCrosses(holes: number) {
  const h = holes / 2;
  return Math.floor((h - 2) / 2);
}

function commonCrosses(holes: number) {
  const presets: Record<number, number[]> = {
    20: [0, 1, 2],
    24: [0, 1, 2, 3],
    28: [0, 1, 2, 3],
    32: [0, 1, 2, 3, 4],
    36: [0, 1, 2, 3, 4],
  };
  return presets[holes] ?? [];
}

export type ParamPanelProps = {
  onParamsChange: (params: PatternRequest) => void;
  initialValues?: PatternRequest;
};

export default function ParamPanel({
  onParamsChange,
  initialValues,
}: ParamPanelProps) {
  const {
    register,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PatternRequest>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? defaultPatternRequest,
  });

  const values = useWatch({ control });
  const holes = values?.holes ?? defaultPatternRequest.holes;
  const h = holes / 2;
  const maxCross = maxCrosses(holes);

  const crossOptions = useMemo(() => {
    const preferred = commonCrosses(holes);
    const all = Array.from({ length: maxCross + 1 }, (_, idx) => idx);
    const set = new Set<number>([...preferred, ...all]);
    return Array.from(set).sort((a, b) => a - b);
  }, [holes, maxCross]);

  useEffect(() => {
    if (values == null) {
      return;
    }
    const timer = window.setTimeout(() => {
      onParamsChange(values as PatternRequest);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [values, onParamsChange]);

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  useEffect(() => {
    if (!values) {
      return;
    }
    if ((values.crosses ?? 0) > maxCross) {
      setValue("crosses", maxCross, { shouldDirty: true });
    }
    if ((values.startRimHole ?? 0) > holes) {
      setValue("startRimHole", holes, { shouldDirty: true });
    }
    if ((values.startHubHoleDS ?? 0) > h) {
      setValue("startHubHoleDS", h, { shouldDirty: true });
    }
    if ((values.startHubHoleNDS ?? 0) > h) {
      setValue("startHubHoleNDS", h, { shouldDirty: true });
    }
  }, [holes, h, maxCross, setValue, values]);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Parameters</h2>
        <p className="text-sm text-slate-600">
          H = {h}, max crosses = {maxCross}
        </p>
      </header>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Holes</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("holes", { valueAsNumber: true })}
          >
            {holeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors.holes && (
            <p className="mt-1 text-xs text-rose-600">{errors.holes.message}</p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Wheel type</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("wheelType")}
          >
            <option value="rear">Rear</option>
            <option value="front">Front</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Crosses</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("crosses", { valueAsNumber: true })}
          >
            {crossOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}x
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Common first, max allowed {maxCross}x.
          </p>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Symmetry</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("symmetry")}
          >
            <option value="symmetrical">Symmetrical</option>
            <option value="asymmetrical">Asymmetrical</option>
          </select>
        </label>

        <label className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-medium">Invert heads</span>
          <input type="checkbox" {...register("invertHeads")} />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Start rim hole</span>
          <input
            type="number"
            min={1}
            max={holes}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("startRimHole", { valueAsNumber: true })}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Valve reference</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("valveReference")}
          >
            <option value="right_of_valve">Right of valve</option>
            <option value="left_of_valve">Left of valve</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Start hub hole (DS)</span>
          <input
            type="number"
            min={1}
            max={h}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("startHubHoleDS", { valueAsNumber: true })}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Start hub hole (NDS)</span>
          <input
            type="number"
            min={1}
            max={h}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("startHubHoleNDS", { valueAsNumber: true })}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => reset(defaultPatternRequest)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Reset defaults
      </button>
    </section>
  );
}
