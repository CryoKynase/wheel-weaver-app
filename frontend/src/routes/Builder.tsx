import { useCallback, useEffect, useMemo, useState } from "react";

import ParamPanel from "../components/ParamPanel";
import PatternTable from "../components/PatternTable";
import PresetBar from "../components/PresetBar";
import {
  computePattern,
  createPreset,
  deletePreset,
  getPreset,
  listPresets,
  updatePreset,
} from "../lib/api";
import { defaultPatternRequest } from "../lib/defaults";
import { evaluateValveClearance } from "../lib/valveClearance";
import type {
  PatternRequest,
  PatternResponse,
  PresetSummary,
} from "../lib/types";

export default function Builder() {
  const [data, setData] = useState<PatternResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [presetBusy, setPresetBusy] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<PatternRequest>(
    defaultPatternRequest
  );
  const [seedValues, setSeedValues] = useState<PatternRequest>(
    defaultPatternRequest
  );
  const [printMode, setPrintMode] = useState(false);

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

  const handleParamsChange = useCallback(async (params: PatternRequest) => {
    setCurrentParams(params);
    setLoading(true);
    setError(null);
    try {
      const response = await computePattern(params);
      setData(response);
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

  const presetSummaryLabel = useMemo(() => {
    const match = presets.find((preset) => preset.id === selectedPresetId);
    if (!match) {
      return null;
    }
    return `${match.holes}H ${match.wheelType} ${match.crosses}x`;
  }, [presets, selectedPresetId]);

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
      } catch (err) {
        setPresetError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setPresetBusy(false);
      }
    },
    []
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
          <p className="text-sm text-slate-600">
            Adjust parameters and review the lacing order live.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {presetSummaryLabel
            ? `Preset: ${presetSummaryLabel}`
            : `Defaults: ${defaultPatternRequest.holes}H ${defaultPatternRequest.crosses}x`}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {!printMode && (
          <aside className="h-fit lg:sticky lg:top-6 no-print">
            <ParamPanel
              onParamsChange={handleParamsChange}
              initialValues={seedValues}
              valveStatus={valveStatus ?? undefined}
            />
          </aside>
        )}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex-1">
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
            <button
              type="button"
              onClick={() => setPrintMode((prev) => !prev)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {printMode ? "Exit print view" : "Print view"}
            </button>
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
          <div className="flex items-center gap-3">
            {loading && (
              <div className="text-sm text-slate-600">Loading pattern...</div>
            )}
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>
          {data ? (
            <PatternTable rows={data.rows} printMode={printMode} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Waiting for parameters...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
