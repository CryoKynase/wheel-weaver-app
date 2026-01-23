import { useCallback, useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import ParamPanel from "../components/ParamPanel";
import PatternDiagram from "../components/PatternDiagram";
import PatternTable from "../components/PatternTable";
import StepToggle from "../components/StepToggle";
import ComputeStatus from "../components/ComputeStatus";
import Seo from "../components/Seo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { createPreset, deletePreset, getPreset, listPresets, updatePreset } from "../lib/api";
import { defaultPatternRequest } from "../lib/defaults";
import { normalizeParamsForHoles } from "../lib/pattern";
import { getSeoMetadata, getSoftwareApplicationJsonLd } from "../lib/seo";
import type { TableColumnVisibility } from "../lib/tableSettings";
import { evaluateValveClearance } from "../lib/valveClearance";
import { trackEvent } from "../lib/analytics";
import {
  METHODS,
  getMethod,
  isInActiveStep,
  normalizeHolesForMethod,
  normalizeMethodId,
} from "../methods/registry";
import type { LacingMethod, MethodId, PatternResult, StepId } from "../methods/types";
import type {
  PatternRequest,
  PatternResponse,
  PatternRow,
  PresetSummary,
} from "../lib/types";

type BuilderProps = {
  tableColumns: TableColumnVisibility;
  fallbackHoles?: number;
};

const csvColumns: Array<keyof PatternRow> = [
  "spoke",
  "order",
  "step",
  "side",
  "oddEvenSet",
  "hubHole",
  "heads",
  "rimHole",
  "crossesDescribed",
  "notes",
];

const DIAGRAM_VIEW_KEY = "wheelweaver.diagram.view";
const DIAGRAM_CURVED_KEY = "wheelweaver.diagram.curved";
const DIAGRAM_OCCLUSION_KEY = "wheelweaver.diagram.occlusion";
const DIAGRAM_SHORTARC_KEY = "wheelweaver.diagram.shortArc";
const DIAGRAM_FAINT_SPOKES_KEY = "wheelweaver.diagram.faintSpokes";
const DIAGRAM_ENGINEER_LOOK_KEY = "wheelweaver.diagram.engineer.lookFrom";
const DIAGRAM_ENGINEER_REAR_FLANGE_KEY =
  "wheelweaver.diagram.engineer.showRearFlange";
const DIAGRAM_ENGINEER_REAR_SPOKES_KEY =
  "wheelweaver.diagram.engineer.showRearSpokes";

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = window.localStorage.getItem(key);
  if (stored === null) {
    return fallback;
  }
  return stored === "true";
}

function readStoredView() {
  if (typeof window === "undefined") {
    return "classic" as const;
  }
  const stored = window.localStorage.getItem(DIAGRAM_VIEW_KEY);
  return stored === "realistic" || stored === "engineer"
    ? stored
    : "classic";
}

function readStoredLookFrom() {
  if (typeof window === "undefined") {
    return "DS" as const;
  }
  const stored = window.localStorage.getItem(DIAGRAM_ENGINEER_LOOK_KEY);
  return stored === "NDS" ? "NDS" : "DS";
}

function defaultsForMethod(method: LacingMethod) {
  return method.params.reduce<Record<string, unknown>>((acc, def) => {
    acc[def.key] = def.default;
    return acc;
  }, {});
}

function buildParamsByMethod() {
  return Object.values(METHODS).reduce<Record<MethodId, Record<string, unknown>>>(
    (acc, method) => {
      acc[method.id] = defaultsForMethod(method);
      return acc;
    },
    {} as Record<MethodId, Record<string, unknown>>
  );
}

function formatCrosses(crosses: number) {
  if (crosses === 0) {
    return "0x radial";
  }
  return `${crosses}x (over ${crosses - 1}, under 1)`;
}

function shallowEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key) => left[key] === right[key]);
}

function rowsFromResult(methodId: MethodId, result: PatternResult): PatternRow[] {
  if (methodId === "schraner" && result.table?.rows) {
    return result.table.rows as PatternRow[];
  }
  return result.spokes.map((spoke) => ({
    spoke: `${spoke.side === "right" ? "R" : "L"}-${String(
      spoke.hubHole
    ).padStart(2, "0")}`,
    order: spoke.spokeIndex,
    step: `Step ${spoke.group}`,
    side: spoke.side === "right" ? "DS" : "NDS",
    oddEvenSet: spoke.hubHole % 2 === 1 ? "Odd" : "Even",
    k: spoke.hubHole,
    hubHole: spoke.hubHole,
    heads: spoke.head === "out" ? "OUT" : "IN",
    rimHole: spoke.rimHole,
    crossesDescribed:
      typeof spoke.crosses === "number" ? formatCrosses(spoke.crosses) : "",
    notes: "",
    group: spoke.group,
  }));
}

function toCsv(rows: PatternRow[]) {
  const header = csvColumns.join(",");
  const lines = rows.map((row) =>
    csvColumns
      .map((key) => {
        const value = row[key] ?? "";
        const text = String(value).replace(/"/g, '""');
        return `"${text}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export default function Builder({ tableColumns, fallbackHoles }: BuilderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { holes: holesParam, method: methodParam } = useParams();
  const parsedHoles = Number(holesParam);
  const methodId = normalizeMethodId(methodParam);
  const method = getMethod(methodId);
  const normalizedHoles = normalizeHolesForMethod(methodId, parsedHoles);
  const hasValidMethodParam = methodParam === methodId;
  const hasValidHolesParam =
    Number.isFinite(parsedHoles) && normalizedHoles === parsedHoles;
  const holes = hasValidHolesParam
    ? parsedHoles
    : fallbackHoles ?? normalizedHoles;
  const seo = useMemo(
    () => getSeoMetadata({ pathname: location.pathname, holes }),
    [location.pathname, holes]
  );
  const jsonLd = useMemo(() => {
    const normalizedPath = location.pathname.startsWith("/")
      ? location.pathname
      : `/${location.pathname}`;
    if (normalizedPath.startsWith("/builder")) {
      return getSoftwareApplicationJsonLd();
    }
    return null;
  }, [location.pathname]);
  const [data, setData] = useState<PatternResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("all");
  const [paramsByMethod, setParamsByMethod] = useState<
    Record<MethodId, Record<string, unknown>>
  >(buildParamsByMethod);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [presetBusy, setPresetBusy] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [activePresetParams, setActivePresetParams] =
    useState<PatternRequest | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [resultsTab, setResultsTab] = useState<"table" | "diagram" | "both">(
    "both"
  );
  const [showDiagramLabels, setShowDiagramLabels] = useState(false);
  const [diagramView, setDiagramView] = useState<
    "classic" | "realistic" | "engineer"
  >(readStoredView);
  const [diagramCurved, setDiagramCurved] = useState(() =>
    readStoredBoolean(DIAGRAM_CURVED_KEY, true)
  );
  const [diagramOcclusion, setDiagramOcclusion] = useState(() =>
    readStoredBoolean(DIAGRAM_OCCLUSION_KEY, true)
  );
  const [diagramShortArc, setDiagramShortArc] = useState(() =>
    readStoredBoolean(DIAGRAM_SHORTARC_KEY, true)
  );
  const [diagramFaintSpokes, setDiagramFaintSpokes] = useState(() =>
    readStoredBoolean(DIAGRAM_FAINT_SPOKES_KEY, true)
  );
  const [diagramZoom, setDiagramZoom] = useState(1);
  const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 });
  const [diagramLocked, setDiagramLocked] = useState(false);
  const [diagramLookFrom, setDiagramLookFrom] = useState<"DS" | "NDS">(
    readStoredLookFrom
  );
  const [diagramShowRearFlange, setDiagramShowRearFlange] = useState(() =>
    readStoredBoolean(DIAGRAM_ENGINEER_REAR_FLANGE_KEY, true)
  );
  const [diagramShowRearSpokes, setDiagramShowRearSpokes] = useState(() =>
    readStoredBoolean(DIAGRAM_ENGINEER_REAR_SPOKES_KEY, true)
  );
  const [visibleRows, setVisibleRows] = useState<PatternRow[]>([]);
  const [highlightRows, setHighlightRows] = useState<PatternRow[]>([]);
  const [hoveredSpoke, setHoveredSpoke] = useState<string | null>(null);
  const [sideFilter, setSideFilter] = useState<"All" | "DS" | "NDS">("All");
  const activeParams = useMemo(
    () => ({
      ...defaultsForMethod(method),
      ...(paramsByMethod[methodId] ?? {}),
    }),
    [method, methodId, paramsByMethod]
  );
  const schranerParams = useMemo(() => {
    if (methodId !== "schraner") {
      return null;
    }
    const merged = {
      ...defaultPatternRequest,
      ...activeParams,
    } as PatternRequest;
    return normalizeParamsForHoles(merged, holes);
  }, [activeParams, holes, methodId]);
  const schranerParamsSafe =
    schranerParams ?? normalizeParamsForHoles(defaultPatternRequest, holes);
  const diagramParams =
    methodId === "schraner" ? schranerParamsSafe : defaultPatternRequest;
  const tableRows = visibleRows.length ? visibleRows : data?.rows ?? [];
  const supportsSteps = Boolean(method.supportsSteps);
  const hasData = Boolean(data);
  const methodNotReady = methodId === "standard" && !hasData;
  const methodOptions = useMemo(() => Object.values(METHODS), []);
  const stepOptions = useMemo(
    () => method.steps ?? [],
    [method.steps]
  );
  const stepBadgeText =
    activeStep === "all"
      ? "All spokes"
      : `Step ${activeStep.replace("step", "")} (Group ${activeStep.replace(
          "step",
          ""
        )})`;

  const handleCopyCsv = useCallback(
    async (rows: PatternRow[]) => {
      try {
        await navigator.clipboard.writeText(toCsv(rows));
        toast({ title: "Copied to clipboard" });
        trackEvent("pattern_copy_csv", {
          row_count: rows.length,
        });
      } catch (err) {
        toast({
          title: "Something went wrong",
          description:
            err instanceof Error ? err.message : "Unable to copy CSV",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleDownloadCsv = useCallback((rows: PatternRow[]) => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wheel-lacing.csv";
    link.click();
    URL.revokeObjectURL(url);
    trackEvent("pattern_download_csv", {
      row_count: rows.length,
    });
  }, []);

  const handleMethodChange = useCallback(
    (nextMethodId: MethodId) => {
      if (nextMethodId === methodId) {
        return;
      }
      const nextHoles = normalizeHolesForMethod(nextMethodId, holes);
      navigate(`/builder/${nextMethodId}/${nextHoles}`);
    },
    [holes, methodId, navigate]
  );

  const handleParamsChange = useCallback(
    async (params: Record<string, unknown>) => {
      const normalizedParams =
        methodId === "schraner"
          ? normalizeParamsForHoles(
              {
                ...defaultPatternRequest,
                ...params,
                holes,
              } as PatternRequest,
              holes
            )
          : params;
      setParamsByMethod((prev) => {
        const current = prev[methodId] ?? {};
        if (shallowEqual(current, normalizedParams as Record<string, unknown>)) {
          return prev;
        }
        return {
          ...prev,
          [methodId]: normalizedParams,
        };
      });
      setLoading(true);
      setError(null);
      try {
        const result = method.compute(holes, normalizedParams);
        const rows = rowsFromResult(methodId, result);
        setData({
          params:
            methodId === "schraner"
              ? (normalizedParams as PatternRequest)
              : {
                holes,
                wheelType: "rear",
                crosses: Number(params.crosses ?? 0),
                  symmetry: "symmetrical",
                  invertHeads: false,
                  startRimHole: 1,
                  valveReference: "right_of_valve",
                  startHubHoleDS: 1,
                  startHubHoleNDS: 1,
                },
          derived: { spokesPerSide: holes / 2 },
          rows,
        });
        setLastUpdated(new Date());
        if (methodId === "schraner") {
          const typed = normalizedParams as PatternRequest;
          trackEvent("pattern_generated", {
            holes: typed.holes,
            crosses: typed.crosses,
            wheel_type: typed.wheelType,
            symmetry: typed.symmetry,
            invert_heads: typed.invertHeads,
            view: "builder",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [holes, method, methodId]
  );

  const refreshPresets = useCallback(async () => {
    if (methodId !== "schraner") {
      return;
    }
    try {
      const list = await listPresets();
      setPresets(list);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : "Unexpected error");
    }
  }, [methodId]);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  useEffect(() => {
    if (methodParam && hasValidHolesParam && hasValidMethodParam) {
      return;
    }
    navigate(`/builder/${methodId}/${normalizedHoles}`, { replace: true });
  }, [
    hasValidHolesParam,
    hasValidMethodParam,
    methodId,
    methodParam,
    navigate,
    normalizedHoles,
  ]);

  useEffect(() => {
    if (methodId !== "schraner" || !schranerParams) {
      return;
    }
    setParamsByMethod((prev) => {
      const current = prev.schraner ?? {};
      const normalized = schranerParams;
      const hasDiff = Object.keys(normalized).some(
        (key) => normalized[key as keyof PatternRequest] !== current[key]
      );
      if (!hasDiff) {
        return prev;
      }
      return {
        ...prev,
        schraner: {
          ...current,
          ...normalized,
        },
      };
    });
  }, [methodId, schranerParams]);

  useEffect(() => {
    setActiveStep("all");
    setVisibleRows([]);
    setHighlightRows([]);
    setHoveredSpoke(null);
    setSelectedPresetId(null);
    setActivePresetParams(null);
    setData(null);
    setError(null);
    setLoading(false);
    setLastUpdated(null);
  }, [methodId]);

  useEffect(() => {
    handleParamsChange(activeParams);
  }, [handleParamsChange, holes, methodId]);

  const presetSummaryLabel = useMemo(() => {
    const match = presets.find((preset) => preset.id === selectedPresetId);
    if (!match) {
      return null;
    }
    return `${match.holes}H ${match.wheelType} ${match.crosses}x`;
  }, [presets, selectedPresetId]);

  const valveStatus = useMemo(() => {
    if (!data || methodId !== "schraner") {
      return null;
    }
    return evaluateValveClearance(
      data.rows,
      schranerParamsSafe.holes,
      schranerParamsSafe.startRimHole,
      schranerParamsSafe.valveReference
    );
  }, [data, methodId, schranerParamsSafe]);

  const stepMatchRows = useMemo(() => {
    if (!data || !supportsSteps || activeStep === "all") {
      return null;
    }
    const hasGroups = data.rows.some((row) => typeof row.group === "number");
    if (!hasGroups) {
      return null;
    }
    return data.rows.filter(
      (row) =>
        typeof row.group === "number" && isInActiveStep(row.group, activeStep)
    );
  }, [activeStep, data, supportsSteps]);

  const diagramVisibleRows = useMemo(() => {
    if (supportsSteps && activeStep !== "all" && stepMatchRows) {
      return stepMatchRows;
    }
    return highlightRows;
  }, [activeStep, highlightRows, stepMatchRows, supportsSteps]);

  const handleSelectPreset = useCallback(
    async (id: string | null) => {
      setSelectedPresetId(id);
      if (!id) {
        setActivePresetParams(null);
        return;
      }
      setPresetBusy(true);
      setPresetError(null);
      try {
        const preset = await getPreset(id);
        setParamsByMethod((prev) => ({
          ...prev,
          schraner: preset.params,
        }));
        setActivePresetParams(preset.params);
        trackEvent("preset_loaded", {
          preset_id: preset.id,
          holes: preset.params.holes,
          crosses: preset.params.crosses,
          wheel_type: preset.params.wheelType,
        });
        if (preset.params.holes !== holes) {
          navigate(`/builder/${methodId}/${preset.params.holes}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setPresetError(message);
        toast({
          title: "Something went wrong",
          description: message,
          variant: "destructive",
        });
      } finally {
        setPresetBusy(false);
      }
    },
    [holes, methodId, navigate, toast]
  );

  const handleSaveAs = useCallback(async (name: string) => {
    if (methodId !== "schraner") {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      const created = await createPreset(name, schranerParamsSafe);
      await refreshPresets();
      setSelectedPresetId(created.id);
      setActivePresetParams(created.params);
      toast({ title: "Preset saved", description: name });
      trackEvent("preset_saved", {
        preset_id: created.id,
        holes: created.params.holes,
        crosses: created.params.crosses,
        wheel_type: created.params.wheelType,
        source: "save_as",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setPresetError(message);
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPresetBusy(false);
    }
  }, [methodId, refreshPresets, schranerParamsSafe, toast]);

  const handleUpdate = useCallback(async () => {
    if (!selectedPresetId) {
      return;
    }
    if (methodId !== "schraner") {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      await updatePreset(selectedPresetId, undefined, schranerParamsSafe);
      await refreshPresets();
      setActivePresetParams(schranerParamsSafe);
      const presetName =
        presets.find((preset) => preset.id === selectedPresetId)?.name ??
        "Preset";
      toast({ title: "Preset saved", description: presetName });
      trackEvent("preset_saved", {
        preset_id: selectedPresetId,
        holes: schranerParamsSafe.holes,
        crosses: schranerParamsSafe.crosses,
        wheel_type: schranerParamsSafe.wheelType,
        source: "update",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setPresetError(message);
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPresetBusy(false);
    }
  }, [methodId, presets, refreshPresets, schranerParamsSafe, selectedPresetId, toast]);

  const handleDelete = useCallback(async () => {
    if (!selectedPresetId) {
      return;
    }
    if (methodId !== "schraner") {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      const presetName =
        presets.find((preset) => preset.id === selectedPresetId)?.name ??
        "Preset";
      await deletePreset(selectedPresetId);
      setSelectedPresetId(null);
      setActivePresetParams(null);
      await refreshPresets();
      toast({ title: "Preset deleted", description: presetName });
      trackEvent("preset_deleted", {
        preset_id: selectedPresetId,
        holes: activePresetParams?.holes,
        crosses: activePresetParams?.crosses,
        wheel_type: activePresetParams?.wheelType,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setPresetError(message);
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPresetBusy(false);
    }
  }, [methodId, presets, refreshPresets, selectedPresetId, toast]);

  useEffect(() => {
    if (printMode) {
      setResultsTab("table");
      window.setTimeout(() => window.print(), 100);
      if (methodId === "schraner") {
        trackEvent("pattern_print_view", {
          holes: schranerParamsSafe.holes,
          crosses: schranerParamsSafe.crosses,
          wheel_type: schranerParamsSafe.wheelType,
          view: "builder",
        });
      }
    }
  }, [methodId, printMode, schranerParamsSafe]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIAGRAM_VIEW_KEY, diagramView);
  }, [diagramView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIAGRAM_CURVED_KEY, String(diagramCurved));
  }, [diagramCurved]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIAGRAM_OCCLUSION_KEY, String(diagramOcclusion));
  }, [diagramOcclusion]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIAGRAM_SHORTARC_KEY, String(diagramShortArc));
  }, [diagramShortArc]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      DIAGRAM_FAINT_SPOKES_KEY,
      String(diagramFaintSpokes)
    );
  }, [diagramFaintSpokes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIAGRAM_ENGINEER_LOOK_KEY, diagramLookFrom);
  }, [diagramLookFrom]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      DIAGRAM_ENGINEER_REAR_FLANGE_KEY,
      String(diagramShowRearFlange)
    );
  }, [diagramShowRearFlange]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      DIAGRAM_ENGINEER_REAR_SPOKES_KEY,
      String(diagramShowRearSpokes)
    );
  }, [diagramShowRearSpokes]);

  useEffect(() => {
    if (diagramZoom <= 1) {
      setDiagramPan({ x: 0, y: 0 });
    }
  }, [diagramZoom]);

  const diagramControls = (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-semibold uppercase text-slate-500">
          View
        </span>
        <div className="inline-flex rounded-md border border-border bg-background p-1">
          {(["classic", "realistic", "engineer"] as const).map((option) => {
            const active = diagramView === option;
            return (
              <Button
                key={option}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDiagramView(option)}
                className={`rounded px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                {option}
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-6 px-2 text-[11px] ${
            showDiagramLabels
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          }`}
          onClick={() => setShowDiagramLabels((prev) => !prev)}
        >
          Labels
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-6 px-2 text-[11px] ${
            diagramFaintSpokes
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          }`}
          onClick={() => setDiagramFaintSpokes((prev) => !prev)}
        >
          Faint spokes
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">-</span>
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.1}
            value={diagramZoom}
            onChange={(event) => setDiagramZoom(Number(event.target.value))}
            aria-label="Diagram zoom"
            className="h-1 w-24 accent-slate-700"
          />
          <span className="text-[11px] font-semibold text-slate-500">+</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={() => {
            setDiagramZoom(1);
            setDiagramPan({ x: 0, y: 0 });
          }}
        >
          Reset view
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-6 px-2 text-[11px] ${
            diagramLocked
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          }`}
          onClick={() => setDiagramLocked((prev) => !prev)}
        >
          {diagramLocked ? "Lock Diagram" : "Unlock Diagram"}
        </Button>
      </div>
      {diagramView === "realistic" && (
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-700"
              checked={diagramCurved}
              onChange={(event) => setDiagramCurved(event.target.checked)}
            />
            <span>Curved spokes</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-700"
              checked={diagramOcclusion}
              onChange={(event) => setDiagramOcclusion(event.target.checked)}
            />
            <span>Hub occlusion</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-700"
              checked={diagramShortArc}
              onChange={(event) => setDiagramShortArc(event.target.checked)}
            />
            <span>Short-arc normalisation</span>
          </label>
        </div>
      )}
      {diagramView === "engineer" && (
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="inline-flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-slate-500">
              Look from
            </span>
            <div className="inline-flex rounded-md border border-border bg-background p-1">
              {(["DS", "NDS"] as const).map((option) => {
                const active = diagramLookFrom === option;
                return (
                  <Button
                    key={option}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDiagramLookFrom(option)}
                    className={`rounded px-3 py-1.5 text-[11px] font-semibold transition ${
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    }`}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-700"
              checked={diagramShowRearFlange}
              onChange={(event) => setDiagramShowRearFlange(event.target.checked)}
            />
            <span>Show rear flange</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-700"
              checked={diagramShowRearSpokes}
              onChange={(event) => setDiagramShowRearSpokes(event.target.checked)}
            />
            <span>Show rear spokes</span>
          </label>
        </div>
      )}
    </div>
  );

  const handleDiagramPanStart = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (diagramLocked) {
      return;
    }
    if (diagramZoom <= 1) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = diagramPan;
    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const maxPan = Math.max(0, (diagramZoom - 1) * 180);
      const clamp = (value: number) => Math.min(maxPan, Math.max(-maxPan, value));
      setDiagramPan({
        x: clamp(startPan.x + dx),
        y: clamp(startPan.y + dy),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const diagramCardClass = `border-l-4 border-l-primary/40 transition-all duration-200 ease-out ${
    diagramLocked ? "lg:sticky lg:top-20 lg:z-30" : ""
  }`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        const firstField = document.querySelector<HTMLElement>(
          "[data-param-panel] select, [data-param-panel] input"
        );
        firstField?.focus();
        return;
      }
      if (methodId === "standard") {
        if (event.key === "0" || event.key === "Escape") {
          setActiveStep("all");
          return;
        }
        if (event.key >= "1" && event.key <= "4") {
          setActiveStep(`step${event.key}` as StepId);
          return;
        }
      }
      if (event.key === "t") {
        setResultsTab("table");
        return;
      }
      if (event.key === "d") {
        setResultsTab("diagram");
        return;
      }
      if (event.key === "b") {
        setResultsTab("both");
        return;
      }
      if (event.key === "p") {
        setResultsTab("table");
        setPrintMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [methodId]);

  return (
    <>
      <Seo {...seo} />
      {jsonLd ? (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        </Helmet>
      ) : null}
      <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Builder</h1>
          <p className="text-sm text-slate-600">{method.shortDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {presetSummaryLabel ? (
            <div>{`Preset: ${presetSummaryLabel}`}</div>
          ) : null}
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link to={`/help/${method.id}`}>Method help</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Method: {method.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {methodOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  disabled={option.id === methodId}
                  onClick={() => handleMethodChange(option.id)}
                >
                  {option.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="!mt-3 space-y-6 lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:space-y-0">
        {!printMode && (
          <aside className="space-y-4 no-print">
            <div className="space-y-3 lg:hidden">
              <Card>
                <details className="group">
                  <summary className="cursor-pointer px-4 pb-3 pt-4 text-sm font-semibold text-slate-900">
                    Parameters
                  </summary>
                  <div className="px-4 pb-4">
                    <ParamPanel
                      holes={holes}
                      params={activeParams}
                      paramDefs={method.params}
                      onParamsChange={handleParamsChange}
                      valveStatus={valveStatus ?? undefined}
                      sideFilter={sideFilter}
                      onSideFilterChange={setSideFilter}
                    />
                  </div>
                </details>
              </Card>
            </div>
            <div className="hidden space-y-4 lg:block lg:sticky lg:top-20">
              <Card>
                <CardContent className="pt-4">
                  <ParamPanel
                    holes={holes}
                    params={activeParams}
                    paramDefs={method.params}
                    onParamsChange={handleParamsChange}
                    valveStatus={valveStatus ?? undefined}
                    sideFilter={sideFilter}
                    onSideFilterChange={setSideFilter}
                  />
                </CardContent>
              </Card>
            </div>
          </aside>
        )}
        <div className="space-y-4">
          <div className="no-print" />
          {printMode && (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                <span>Print view</span>
                {valveStatus && (
                  <span
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
              <div className="mt-1 text-xs text-slate-600">
                {methodId === "schraner" ? (
                  <>
                    {schranerParamsSafe.holes}H · {schranerParamsSafe.wheelType} ·{" "}
                    {schranerParamsSafe.crosses}x · {schranerParamsSafe.symmetry} ·{" "}
                    {schranerParamsSafe.invertHeads ? "Invert heads" : "Default heads"} ·{" "}
                    startRimHole {schranerParamsSafe.startRimHole} ·{" "}
                    {schranerParamsSafe.valveReference.replace("_", " ")} · DS hub{" "}
                    {schranerParamsSafe.startHubHoleDS} · NDS hub{" "}
                    {schranerParamsSafe.startHubHoleNDS}
                  </>
                ) : (
                  <>{holes}H · {method.name}</>
                )}
              </div>
            </div>
          )}
          <ComputeStatus
            loading={loading}
            error={error}
            rowCount={data?.rows.length ?? null}
            lastUpdated={lastUpdated}
            onRetry={() => handleParamsChange(activeParams)}
          />
          {error && (
            <Card className="transition-all duration-200 ease-out">
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">Unable to compute pattern</CardTitle>
                  <CardDescription>{error}</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleParamsChange(activeParams)}
                >
                  Retry
                </Button>
              </CardHeader>
            </Card>
          )}
          {loading && !data && (
            <Card className="transition-all duration-200 ease-out">
              <CardHeader>
                <CardTitle className="text-sm">Calculating pattern…</CardTitle>
                <CardDescription>
                  Crunching the spoke order and valve alignment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Loading results…
                </div>
              </CardContent>
            </Card>
          )}
          <Tabs
            value={resultsTab}
            onValueChange={(value) =>
              setResultsTab(value as "table" | "diagram" | "both")
            }
            className="space-y-3"
          >
              <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="table"
                  className="rounded-md border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent/40 hover:border-primary/30 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Table
                </TabsTrigger>
                <TabsTrigger
                  value="diagram"
                  disabled={printMode}
                  className="rounded-md border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent/40 hover:border-primary/30 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                >
                  Diagram
                </TabsTrigger>
                <TabsTrigger
                  value="both"
                  disabled={printMode}
                  className="rounded-md border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent/40 hover:border-primary/30 hover:text-foreground data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                >
                  Both
                </TabsTrigger>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPrintMode((prev) => !prev)}
                >
                  {printMode ? "Exit print view" : "Print view"}
                </Button>
              </TabsList>
              <TabsContent
                value="table"
                className="transition-all duration-200 data-[state=inactive]:translate-y-1 data-[state=inactive]:opacity-0 data-[state=active]:translate-y-0 data-[state=active]:opacity-100"
              >
                {hasData ? (
                  <Card
                    id="pattern-table"
                    className="border-l-4 border-l-primary/40 transition-all duration-200 ease-out"
                  >
                    <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Table
                      </div>
                      {supportsSteps && (
                        <StepToggle
                          steps={stepOptions}
                          activeStep={activeStep}
                          onChange={setActiveStep}
                          compact
                        />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs hover:text-primary sm:ml-auto"
                          >
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleCopyCsv(tableRows)}
                          >
                            Copy visible rows as CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyCsv(data.rows)}
                          >
                            Copy all rows as CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadCsv(data.rows)}
                          >
                            Download CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPrintMode(true)}
                          >
                            Print
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-1.5">
                      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                        <PatternTable
                          rows={data.rows}
                          printMode={printMode}
                          onVisibleRowsChange={setVisibleRows}
                          onHighlightRowsChange={setHighlightRows}
                          onHoverSpokeChange={setHoveredSpoke}
                          sideFilter={sideFilter}
                          columnVisibility={tableColumns}
                          activeStepFilter={activeStep}
                          showStepControls={!supportsSteps}
                          analyticsContext={{
                            holes: schranerParamsSafe.holes,
                            crosses: schranerParamsSafe.crosses,
                            wheelType: schranerParamsSafe.wheelType,
                            symmetry: schranerParamsSafe.symmetry,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 sm:hidden">
                        Tip: scroll horizontally for more columns.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-l-4 border-l-primary/20 bg-muted/20">
                    <CardHeader>
                      <CardTitle className="text-sm">Table</CardTitle>
                      <CardDescription>
                        {methodNotReady
                          ? "This method is not implemented yet."
                          : "Adjust parameters to generate a table."}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </TabsContent>
              <TabsContent
                value="diagram"
                className="transition-all duration-200 data-[state=inactive]:translate-y-1 data-[state=inactive]:opacity-0 data-[state=active]:translate-y-0 data-[state=active]:opacity-100"
              >
                {!printMode &&
                  (hasData ? (
                    <Card className={diagramCardClass}>
                      <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Diagram
                        </div>
                        {supportsSteps && (
                          <StepToggle
                            steps={stepOptions}
                            activeStep={activeStep}
                            onChange={setActiveStep}
                            compact
                          />
                        )}
                        {supportsSteps && (
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/10 text-foreground"
                          >
                            {stepBadgeText}
                          </Badge>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                          {sideFilter !== "All" && (
                            <Badge variant="neutral">Filter: {sideFilter}</Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-primary underline-offset-4 hover:bg-primary/10 hover:text-primary hover:underline sm:ml-auto"
                          aria-label="Jump to the pattern table"
                          onClick={() => {
                            setResultsTab("table");
                            window.requestAnimationFrame(() => {
                              document
                                .getElementById("pattern-table")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            });
                          }}
                        >
                          Jump to table
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-1.5">
                        <div className="space-y-3">
                        {diagramControls}
                        {supportsSteps && (
                          <p className="text-xs text-muted-foreground">
                            Each step is one spoke group: a side + heads-in/out. Use All
                            to see the full wheel.
                          </p>
                        )}
                          <p className="text-xs text-slate-600 lg:hidden">
                            Tap a row in the table to highlight it here.
                          </p>
                          <div className="grid max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <div
                              className={`relative h-[360px] w-full overflow-hidden rounded-md border border-slate-200 bg-white ${
                                diagramZoom > 1
                                  ? "cursor-grab active:cursor-grabbing"
                                  : ""
                              }`}
                              onPointerDown={handleDiagramPanStart}
                              style={{
                                touchAction: diagramZoom > 1 ? "none" : "auto",
                              }}
                            >
                              <div
                                className="h-full w-full"
                                style={{
                                  transform: `translate(${diagramPan.x}px, ${diagramPan.y}px) scale(${diagramZoom})`,
                                  transformOrigin: "center",
                                }}
                              >
                              <PatternDiagram
                                  holes={diagramParams.holes}
                                  rows={data.rows}
                                  visibleRows={diagramVisibleRows}
                                  startRimHole={diagramParams.startRimHole}
                                  valveReference={diagramParams.valveReference}
                                  hoveredSpoke={hoveredSpoke}
                                  showLabels={showDiagramLabels}
                                  showFaintSpokes={diagramFaintSpokes}
                                  view={diagramView}
                                  curved={diagramCurved}
                                  occlusion={diagramOcclusion}
                                  shortArc={diagramShortArc}
                                  lookFrom={diagramLookFrom}
                                  showRearFlange={diagramShowRearFlange}
                                  showRearSpokes={diagramShowRearSpokes}
                                />
                              </div>
                            </div>
                            <div className="hidden space-y-3 text-xs text-slate-600 lg:block">
                              <div className="text-[11px] font-semibold uppercase text-slate-500">
                                How to read this
                              </div>
                              <p>
                                Each line is a spoke path. Switch to Table or Both
                                to filter steps or focus a specific spoke.
                              </p>
                              <div className="pt-1 text-[11px] font-semibold uppercase text-slate-500">
                                Spoke: {hoveredSpoke ?? "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-l-4 border-l-primary/20 bg-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm">Diagram</CardTitle>
                        <CardDescription>
                          {methodNotReady
                            ? "This method is not implemented yet."
                            : "Adjust parameters to generate a diagram."}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
              </TabsContent>
              <TabsContent
                value="both"
                className="transition-all duration-200 data-[state=inactive]:translate-y-1 data-[state=inactive]:opacity-0 data-[state=active]:translate-y-0 data-[state=active]:opacity-100"
              >
                <div className="space-y-2">
                  {!printMode &&
                    (hasData ? (
                      <Card className={diagramCardClass}>
                      <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Diagram
                      </div>
                      {supportsSteps && (
                        <StepToggle
                          steps={stepOptions}
                          activeStep={activeStep}
                          onChange={setActiveStep}
                          compact
                        />
                      )}
                      {supportsSteps && (
                        <Badge
                          variant="outline"
                          className="border-primary/20 bg-primary/10 text-foreground"
                        >
                          {stepBadgeText}
                        </Badge>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                        {sideFilter !== "All" && (
                          <Badge variant="neutral">Filter: {sideFilter}</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-primary underline-offset-4 hover:bg-primary/10 hover:text-primary hover:underline sm:ml-auto"
                          aria-label="Jump to the pattern table"
                          onClick={() =>
                            document
                              .getElementById("pattern-table-both")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              })
                          }
                        >
                          Jump to table
                        </Button>
                      </CardHeader>
                        <CardContent className="pt-1.5">
                          <div className="space-y-3">
                          {diagramControls}
                          {supportsSteps && (
                            <p className="text-xs text-muted-foreground">
                              Each step is one spoke group: a side + heads-in/out. Use All
                              to see the full wheel.
                            </p>
                          )}
                          <div className="relative">
                            <Badge
                              variant="neutral"
                              className={`pointer-events-none absolute left-3 top-3 transition-opacity duration-150 ${
                                hoveredSpoke ? "opacity-100" : "opacity-0"
                              }`}
                            >
                              Spoke: {hoveredSpoke ?? "—"}
                            </Badge>
                            <p className="text-xs text-slate-600 lg:hidden">
                              Tap a row in the table to highlight it here.
                            </p>
                            <div className="mt-2 grid max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                              <div
                                className={`relative h-[360px] w-full overflow-hidden rounded-md border border-slate-200 bg-white ${
                                  diagramZoom > 1
                                    ? "cursor-grab active:cursor-grabbing"
                                    : ""
                                }`}
                                onPointerDown={handleDiagramPanStart}
                                style={{
                                  touchAction: diagramZoom > 1 ? "none" : "auto",
                                }}
                              >
                                <div
                                  className="h-full w-full"
                                  style={{
                                    transform: `translate(${diagramPan.x}px, ${diagramPan.y}px) scale(${diagramZoom})`,
                                    transformOrigin: "center",
                                  }}
                                >
                                  <PatternDiagram
                                    holes={diagramParams.holes}
                                    rows={data.rows}
                                    visibleRows={diagramVisibleRows}
                                    startRimHole={diagramParams.startRimHole}
                                    valveReference={diagramParams.valveReference}
                                    hoveredSpoke={hoveredSpoke}
                                    showLabels={showDiagramLabels}
                                    showFaintSpokes={diagramFaintSpokes}
                                    view={diagramView}
                                    curved={diagramCurved}
                                    occlusion={diagramOcclusion}
                                    shortArc={diagramShortArc}
                                    lookFrom={diagramLookFrom}
                                    showRearFlange={diagramShowRearFlange}
                                    showRearSpokes={diagramShowRearSpokes}
                                  />
                                </div>
                              </div>
                              <div className="hidden space-y-3 text-xs text-slate-600 lg:block">
                                <div className="text-[11px] font-semibold uppercase text-slate-500">
                                  How to read this
                                </div>
                                  <p>
                                    Each line is a spoke path. Hover rows in the table to
                                    highlight them here.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-l-4 border-l-primary/20 bg-muted/20">
                        <CardHeader>
                          <CardTitle className="text-sm">Diagram</CardTitle>
                          <CardDescription>
                            {methodNotReady
                              ? "This method is not implemented yet."
                              : "Adjust parameters to generate a diagram."}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  {hasData ? (
                    <Card
                      id="pattern-table-both"
                      className="border-l-4 border-l-primary/40 transition-all duration-200 ease-out"
                    >
                      <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
                        <div className="text-xs font-semibold text-muted-foreground">
                          Table
                        </div>
                        {supportsSteps && (
                          <StepToggle
                            steps={stepOptions}
                            activeStep={activeStep}
                            onChange={setActiveStep}
                            compact
                          />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs hover:text-primary sm:ml-auto"
                            >
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleCopyCsv(tableRows)}
                            >
                              Copy visible rows as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyCsv(data.rows)}
                            >
                              Copy all rows as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadCsv(data.rows)}
                            >
                              Download CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setPrintMode(true)}
                            >
                              Print
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-1.5">
                        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                          <PatternTable
                            rows={data.rows}
                            printMode={printMode}
                            onVisibleRowsChange={setVisibleRows}
                            onHighlightRowsChange={setHighlightRows}
                            onHoverSpokeChange={setHoveredSpoke}
                            sideFilter={sideFilter}
                            columnVisibility={tableColumns}
                            activeStepFilter={activeStep}
                            showStepControls={!supportsSteps}
                            analyticsContext={{
                              holes: schranerParamsSafe.holes,
                              crosses: schranerParamsSafe.crosses,
                              wheelType: schranerParamsSafe.wheelType,
                              symmetry: schranerParamsSafe.symmetry,
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 sm:hidden">
                          Tip: scroll horizontally for more columns.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-l-4 border-l-primary/20 bg-muted/20">
                      <CardHeader>
                        <CardTitle className="text-sm">Table</CardTitle>
                        <CardDescription>
                          {methodNotReady
                            ? "This method is not implemented yet."
                            : "Adjust parameters to generate a table."}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
        </div>
      </div>
      </section>
    </>
  );
}
