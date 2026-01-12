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
        <aside className="h-fit lg:sticky lg:top-6">
          <ParamPanel
            onParamsChange={handleParamsChange}
            initialValues={seedValues}
          />
        </aside>
        <div className="space-y-4">
          <PresetBar
            presets={presets}
            selectedPresetId={selectedPresetId}
            onSelect={handleSelectPreset}
            onSaveAs={handleSaveAs}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            busy={presetBusy}
          />
          {presetError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {presetError}
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
            <PatternTable rows={data.rows} />
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
