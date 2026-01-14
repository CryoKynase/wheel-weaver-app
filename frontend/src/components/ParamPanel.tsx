import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { defaultPatternRequest } from "../lib/defaults";
import type { PatternRequest } from "../lib/types";

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
  holes: number;
  onParamsChange: (params: PatternRequest) => void;
  initialValues?: PatternRequest;
  valveStatus?: { status: "clear" | "crowded"; reason: string };
  sideFilter: "All" | "DS" | "NDS";
  onSideFilterChange: (next: "All" | "DS" | "NDS") => void;
};

type ParamGroupProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
};

function ParamGroup({
  title,
  description,
  defaultOpen = true,
  collapsible = true,
  children,
}: ParamGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  if (!collapsible) {
    return (
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>
        <div className="space-y-4">{children}</div>
      </section>
    );
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
      className="rounded-md border border-slate-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-900">
        {title}
        {description && (
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {description}
          </span>
        )}
      </summary>
      <div className="space-y-4 px-3 pb-3">{children}</div>
    </details>
  );
}

export default function ParamPanel({
  holes,
  onParamsChange,
  initialValues,
  valveStatus,
  sideFilter,
  onSideFilterChange,
}: ParamPanelProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const {
    register,
    control,
    reset,
    setValue,
  } = useForm<PatternRequest>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? defaultPatternRequest,
  });

  const values = useWatch({ control });
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
      reset({ ...initialValues, holes });
    }
  }, [holes, initialValues, reset]);

  useEffect(() => {
    if (!values) {
      return;
    }
    if ((values.holes ?? 0) !== holes) {
      setValue("holes", holes, { shouldDirty: true });
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

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const openBasics = true;
  const openRimValve = isDesktop;
  const openHub = isDesktop;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Parameters</h2>
          {valveStatus && (
            <span
              title={valveStatus.reason}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                valveStatus.status === "clear"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {valveStatus.status === "clear"
                ? "Valve area looks clear"
                : "Valve area may be crowded"}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          H = {h}, max crosses = {maxCross}
        </p>
      </header>

      <div className="space-y-4">
        <ParamGroup title="Basics" defaultOpen={openBasics}>
          <label className="block">
            <span className="text-sm font-medium">DS/NDS</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={sideFilter}
              onChange={(event) =>
                onSideFilterChange(event.target.value as "All" | "DS" | "NDS")
              }
            >
              <option value="All">All</option>
              <option value="DS">DS</option>
              <option value="NDS">NDS</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Filter the output by drive side or non-drive side.
            </p>
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
        </ParamGroup>

        <ParamGroup
          title="Rim + Valve"
          description="Rim hole and valve alignment choices."
          defaultOpen={openRimValve}
        >
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
        </ParamGroup>

        <ParamGroup
          title="Hub Starts"
          description="Where lacing begins on each flange."
          defaultOpen={openHub}
        >
          <label className="block">
            <span className="text-sm font-medium">Start hub hole (DS)</span>
            <input
              type="number"
              min={1}
              max={h}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              {...register("startHubHoleDS", { valueAsNumber: true })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Counted from the DS flange, 1 to {h}.
            </p>
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
            <p className="mt-1 text-xs text-slate-500">
              Counted from the NDS flange, 1 to {h}.
            </p>
          </label>
        </ParamGroup>
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
