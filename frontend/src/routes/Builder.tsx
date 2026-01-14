import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ParamPanel from "../components/ParamPanel";
import PatternDiagram from "../components/PatternDiagram";
import PatternTable from "../components/PatternTable";
import PresetBar from "../components/PresetBar";
import SchranerIntro from "../components/SchranerIntro";
import ComputeStatus from "../components/ComputeStatus";
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
import {
  computePattern,
  createPreset,
  deletePreset,
  getPreset,
  listPresets,
  updatePreset,
} from "../lib/api";
import { defaultPatternRequest } from "../lib/defaults";
import { isHoleOption } from "../lib/holeOptions";
import type { TableColumnVisibility } from "../lib/tableSettings";
import { evaluateValveClearance } from "../lib/valveClearance";
import type {
  PatternRequest,
  PatternResponse,
  PatternRow,
  PresetSummary,
} from "../lib/types";

type BuilderProps = {
  tableColumns: TableColumnVisibility;
};

function maxCrosses(holes: number) {
  const h = holes / 2;
  return Math.floor((h - 2) / 2);
}

function normalizeParamsForHoles(
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

export default function Builder({ tableColumns }: BuilderProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { holes: holesParam } = useParams();
  const parsedHoles = Number(holesParam);
  const hasValidHolesParam = isHoleOption(parsedHoles);
  const holes = hasValidHolesParam
    ? parsedHoles
    : defaultPatternRequest.holes;
  const [data, setData] = useState<PatternResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [presetBusy, setPresetBusy] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<PatternRequest>(() =>
    normalizeParamsForHoles(defaultPatternRequest, holes)
  );
  const [activePresetParams, setActivePresetParams] =
    useState<PatternRequest | null>(null);
  const [seedValues, setSeedValues] = useState<PatternRequest>(() =>
    normalizeParamsForHoles(defaultPatternRequest, holes)
  );
  const [printMode, setPrintMode] = useState(false);
  const [resultsTab, setResultsTab] = useState<"table" | "diagram" | "both">(
    "both"
  );
  const [visibleRows, setVisibleRows] = useState<PatternRow[]>([]);
  const [highlightRows, setHighlightRows] = useState<PatternRow[]>([]);
  const [hoveredSpoke, setHoveredSpoke] = useState<string | null>(null);
  const [sideFilter, setSideFilter] = useState<"All" | "DS" | "NDS">("All");
  const tableRows = visibleRows.length ? visibleRows : data?.rows ?? [];

  const handleCopyCsv = useCallback(
    async (rows: PatternRow[]) => {
      try {
        await navigator.clipboard.writeText(toCsv(rows));
        toast({ title: "Copied to clipboard" });
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
  }, []);

  const handleParamsChange = useCallback(async (params: PatternRequest) => {
    setCurrentParams(params);
    setLoading(true);
    setError(null);
    try {
      const response = await computePattern(params);
      setData(response);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPresets = useCallback(async () => {
    try {
      const list = await listPresets();
      setPresets(list);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : "Unexpected error");
    }
  }, []);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  useEffect(() => {
    if (!holesParam || hasValidHolesParam) {
      return;
    }
    navigate(`/builder/${defaultPatternRequest.holes}`, { replace: true });
  }, [hasValidHolesParam, holesParam, navigate]);

  useEffect(() => {
    setSeedValues((prev) => normalizeParamsForHoles(prev, holes));
    setCurrentParams((prev) => normalizeParamsForHoles(prev, holes));
  }, [holes]);

  const presetSummaryLabel = useMemo(() => {
    const match = presets.find((preset) => preset.id === selectedPresetId);
    if (!match) {
      return null;
    }
    return `${match.holes}H ${match.wheelType} ${match.crosses}x`;
  }, [presets, selectedPresetId]);

  const valveStatus = useMemo(() => {
    if (!data) {
      return null;
    }
    return evaluateValveClearance(
      data.rows,
      currentParams.holes,
      currentParams.startRimHole,
      currentParams.valveReference
    );
  }, [currentParams, data]);

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
        setSeedValues(preset.params);
        setActivePresetParams(preset.params);
        if (preset.params.holes !== holes) {
          navigate(`/builder/${preset.params.holes}`);
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
    [holes, navigate, toast]
  );

  const handleSaveAs = useCallback(async (name: string) => {
    setPresetBusy(true);
    setPresetError(null);
    try {
      const created = await createPreset(name, currentParams);
      await refreshPresets();
      setSelectedPresetId(created.id);
      setActivePresetParams(created.params);
      toast({ title: "Preset saved", description: name });
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
  }, [currentParams, refreshPresets, toast]);

  const handleUpdate = useCallback(async () => {
    if (!selectedPresetId) {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      await updatePreset(selectedPresetId, undefined, currentParams);
      await refreshPresets();
      setActivePresetParams(currentParams);
      const presetName =
        presets.find((preset) => preset.id === selectedPresetId)?.name ??
        "Preset";
      toast({ title: "Preset saved", description: presetName });
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
  }, [currentParams, presets, refreshPresets, selectedPresetId, toast]);

  const handleDelete = useCallback(async () => {
    if (!selectedPresetId) {
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
  }, [presets, refreshPresets, selectedPresetId, toast]);

  useEffect(() => {
    if (printMode) {
      setResultsTab("table");
      window.setTimeout(() => window.print(), 100);
    }
  }, [printMode]);

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
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Builder</h1>
        </div>
        <div className="text-xs text-slate-500">
          {presetSummaryLabel
            ? `Preset: ${presetSummaryLabel}`
            : `Defaults: ${defaultPatternRequest.holes}H ${defaultPatternRequest.crosses}x`}
        </div>
      </div>

      <SchranerIntro />

      <div className="space-y-6 lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:space-y-0">
        {!printMode && (
          <aside className="space-y-4 no-print">
            <div className="space-y-3 lg:hidden">
              <Card>
                <details className="group">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
                    Parameters
                  </summary>
                  <div className="px-4 pb-4">
                    <ParamPanel
                      holes={holes}
                      onParamsChange={handleParamsChange}
                      initialValues={seedValues}
                      valveStatus={valveStatus ?? undefined}
                      sideFilter={sideFilter}
                      onSideFilterChange={setSideFilter}
                    />
                  </div>
                </details>
              </Card>
              <Card>
                <details className="group">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
                    Presets
                  </summary>
                  <div className="px-4 pb-4">
                    <PresetBar
                      presets={presets}
                      selectedPresetId={selectedPresetId}
                      currentParams={currentParams}
                      activePresetParams={activePresetParams}
                      presetError={presetError}
                      onSelect={handleSelectPreset}
                      onSaveAs={handleSaveAs}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      busy={presetBusy}
                    />
                  </div>
                </details>
              </Card>
            </div>
            <div className="hidden space-y-4 lg:block lg:sticky lg:top-20">
              <Card>
                <CardContent>
                  <ParamPanel
                    holes={holes}
                    onParamsChange={handleParamsChange}
                    initialValues={seedValues}
                    valveStatus={valveStatus ?? undefined}
                    sideFilter={sideFilter}
                    onSideFilterChange={setSideFilter}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <PresetBar
                    presets={presets}
                    selectedPresetId={selectedPresetId}
                    currentParams={currentParams}
                    activePresetParams={activePresetParams}
                    presetError={presetError}
                    onSelect={handleSelectPreset}
                    onSaveAs={handleSaveAs}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    busy={presetBusy}
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
                {currentParams.holes}H · {currentParams.wheelType} ·{" "}
                {currentParams.crosses}x · {currentParams.symmetry} ·{" "}
                {currentParams.invertHeads ? "Invert heads" : "Default heads"} ·{" "}
                startRimHole {currentParams.startRimHole} ·{" "}
                {currentParams.valveReference.replace("_", " ")} · DS hub{" "}
                {currentParams.startHubHoleDS} · NDS hub{" "}
                {currentParams.startHubHoleNDS}
              </div>
            </div>
          )}
          <ComputeStatus
            loading={loading}
            error={error}
            rowCount={data?.rows.length ?? null}
            lastUpdated={lastUpdated}
            onRetry={() => handleParamsChange(currentParams)}
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
                  onClick={() => handleParamsChange(currentParams)}
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
          {data ? (
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
                <Card
                  id="pattern-table"
                  className="border-l-4 border-l-primary/40 transition-all duration-200 ease-out"
                >
                  <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
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
                      />
                    </div>
                    <p className="text-xs text-slate-500 sm:hidden">
                      Tip: scroll horizontally for more columns.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent
                value="diagram"
                className="transition-all duration-200 data-[state=inactive]:translate-y-1 data-[state=inactive]:opacity-0 data-[state=active]:translate-y-0 data-[state=active]:opacity-100"
              >
                {!printMode && (
                  <Card className="border-l-4 border-l-primary/40 transition-all duration-200 ease-out">
                    <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-slate-500">
                        {sideFilter !== "All" && (
                          <Badge variant="neutral">Filter: {sideFilter}</Badge>
                        )}
                        {hoveredSpoke && (
                          <Badge variant="neutral">Spoke: {hoveredSpoke}</Badge>
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
                      <p className="text-xs text-slate-600 lg:hidden">
                        Hover a row in the table to highlight it here.
                      </p>
                      <div className="mt-2 grid max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                        <PatternDiagram
                          holes={currentParams.holes}
                          rows={data.rows}
                          visibleRows={highlightRows}
                          startRimHole={currentParams.startRimHole}
                          valveReference={currentParams.valveReference}
                          hoveredSpoke={hoveredSpoke}
                        />
                        <div className="hidden space-y-3 text-xs text-slate-600 lg:block">
                          <div className="text-[11px] font-semibold uppercase text-slate-500">
                            How to read this
                          </div>
                          <p>
                            Each line is a spoke path. Hover rows in the table to
                            highlight them here.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                              DS
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                              NDS
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              <TabsContent
                value="both"
                className="transition-all duration-200 data-[state=inactive]:translate-y-1 data-[state=inactive]:opacity-0 data-[state=active]:translate-y-0 data-[state=active]:opacity-100"
              >
                <div className="space-y-2">
                  {!printMode && (
                    <Card className="border-l-4 border-l-primary/40 transition-all duration-200 ease-out">
                      <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-slate-500">
                          {sideFilter !== "All" && (
                            <Badge variant="neutral">Filter: {sideFilter}</Badge>
                          )}
                          {hoveredSpoke && (
                            <Badge variant="neutral">Spoke: {hoveredSpoke}</Badge>
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
                        <p className="text-xs text-slate-600 lg:hidden">
                          Hover a row in the table to highlight it here.
                        </p>
                        <div className="mt-2 grid max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                          <PatternDiagram
                            holes={currentParams.holes}
                            rows={data.rows}
                            visibleRows={highlightRows}
                            startRimHole={currentParams.startRimHole}
                            valveReference={currentParams.valveReference}
                            hoveredSpoke={hoveredSpoke}
                          />
                          <div className="hidden space-y-3 text-xs text-slate-600 lg:block">
                            <div className="text-[11px] font-semibold uppercase text-slate-500">
                              How to read this
                            </div>
                            <p>
                              Each line is a spoke path. Hover rows in the table to
                              highlight them here.
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                DS
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                NDS
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card
                    id="pattern-table-both"
                    className="border-l-4 border-l-primary/40 transition-all duration-200 ease-out"
                  >
                    <CardHeader className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 py-1.5">
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
                      <div className="overflow-auto rounded-md border border-slate-200 bg-white lg:max-h-[calc(100vh-420px)]">
                        <PatternTable
                          rows={data.rows}
                          printMode={printMode}
                          onVisibleRowsChange={setVisibleRows}
                          onHighlightRowsChange={setHighlightRows}
                          onHoverSpokeChange={setHoveredSpoke}
                          sideFilter={sideFilter}
                          columnVisibility={tableColumns}
                        />
                      </div>
                      <p className="text-xs text-slate-500 sm:hidden">
                        Tip: scroll horizontally for more columns.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Pick your wheel basics to generate a pattern.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
