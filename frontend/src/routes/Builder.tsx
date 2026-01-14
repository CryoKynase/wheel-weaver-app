import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ParamPanel from "../components/ParamPanel";
import PatternDiagram from "../components/PatternDiagram";
import PatternTable from "../components/PatternTable";
import PresetBar from "../components/PresetBar";
import SchranerIntro from "../components/SchranerIntro";
import ComputeStatus from "../components/ComputeStatus";
import { Card, CardContent } from "../components/ui/Card";
import Segmented, { type SegmentedValue } from "../components/ui/Segmented";
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

export default function Builder({ tableColumns }: BuilderProps) {
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
  const [seedValues, setSeedValues] = useState<PatternRequest>(() =>
    normalizeParamsForHoles(defaultPatternRequest, holes)
  );
  const [printMode, setPrintMode] = useState(false);
  const [resultsView, setResultsView] = useState<SegmentedValue>("both");
  const [splitView, setSplitView] = useState(false);
  const [visibleRows, setVisibleRows] = useState<PatternRow[]>([]);
  const [highlightRows, setHighlightRows] = useState<PatternRow[]>([]);
  const [hoveredSpoke, setHoveredSpoke] = useState<string | null>(null);
  const [sideFilter, setSideFilter] = useState<"All" | "DS" | "NDS">("All");

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
        return;
      }
      setPresetBusy(true);
      setPresetError(null);
      try {
        const preset = await getPreset(id);
        setSeedValues(preset.params);
        if (preset.params.holes !== holes) {
          navigate(`/builder/${preset.params.holes}`);
        }
      } catch (err) {
        setPresetError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setPresetBusy(false);
      }
    },
    [holes, navigate]
  );

  const handleSaveAs = useCallback(async () => {
    const name = window.prompt("Preset name?");
    if (!name) {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      const created = await createPreset(name, currentParams);
      await refreshPresets();
      setSelectedPresetId(created.id);
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPresetBusy(false);
    }
  }, [currentParams, refreshPresets]);

  const handleUpdate = useCallback(async () => {
    if (!selectedPresetId) {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      await updatePreset(selectedPresetId, undefined, currentParams);
      await refreshPresets();
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPresetBusy(false);
    }
  }, [currentParams, refreshPresets, selectedPresetId]);

  const handleDelete = useCallback(async () => {
    if (!selectedPresetId) {
      return;
    }
    const confirmed = window.confirm("Delete this preset?");
    if (!confirmed) {
      return;
    }
    setPresetBusy(true);
    setPresetError(null);
    try {
      await deletePreset(selectedPresetId);
      setSelectedPresetId(null);
      await refreshPresets();
    } catch (err) {
      setPresetError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPresetBusy(false);
    }
  }, [refreshPresets, selectedPresetId]);

  useEffect(() => {
    if (printMode) {
      window.setTimeout(() => window.print(), 100);
    }
  }, [printMode]);

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
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                value={resultsView}
                onChange={setResultsView}
                label="Results"
              />
              {resultsView === "both" && (
                <button
                  type="button"
                  onClick={() => setSplitView((prev) => !prev)}
                  className="hidden rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 2xl:inline-flex"
                >
                  Split view {splitView ? "On" : "Off"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintMode((prev) => !prev)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                {printMode ? "Exit print view" : "Print view"}
              </button>
            </div>
          </div>
          {presetError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {presetError}
            </div>
          )}
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
          {data ? (
            <>
              {resultsView === "both" && (
                <div
                  className={
                    splitView && !printMode
                      ? "grid gap-4 2xl:grid-cols-[minmax(420px,0.9fr)_minmax(640px,1.1fr)]"
                      : "space-y-4"
                  }
                >
                  {!printMode && (
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase text-slate-500">
                            Pattern diagram
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              document
                                .getElementById("pattern-table")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                            }
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Jump to table
                          </button>
                        </div>
                        <div className="mt-3 max-w-full">
                          <PatternDiagram
                            holes={currentParams.holes}
                            rows={data.rows}
                            visibleRows={highlightRows}
                            startRimHole={currentParams.startRimHole}
                            valveReference={currentParams.valveReference}
                            hoveredSpoke={hoveredSpoke}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardContent className="space-y-3">
                      <div
                        id="pattern-table"
                        className="text-xs font-semibold uppercase text-slate-500"
                      >
                        Pattern table
                      </div>
                      <div className="overflow-x-auto">
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
                    </CardContent>
                  </Card>
                </div>
              )}
              {resultsView === "diagram" && !printMode && (
                <Card>
                  <CardContent>
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Pattern diagram
                    </div>
                    <div className="mt-3 max-w-full">
                      <PatternDiagram
                        holes={currentParams.holes}
                        rows={data.rows}
                        visibleRows={highlightRows}
                        startRimHole={currentParams.startRimHole}
                        valveReference={currentParams.valveReference}
                        hoveredSpoke={hoveredSpoke}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              {resultsView === "table" && (
                <Card>
                  <CardContent className="space-y-3">
                    <div
                      id="pattern-table"
                      className="text-xs font-semibold uppercase text-slate-500"
                    >
                      Pattern table
                    </div>
                    <div className="overflow-x-auto">
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
                  </CardContent>
                </Card>
              )}
            </>
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
