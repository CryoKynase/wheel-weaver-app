import type { PatternRequest, PresetSummary } from "../lib/types";
import Badge from "@/components/ui/Badge";

export type PresetBarProps = {
  presets: PresetSummary[];
  selectedPresetId: string | null;
  currentParams: PatternRequest;
  activePresetParams: PatternRequest | null;
  onSelect: (id: string | null) => void;
  onSaveAs: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  busy?: boolean;
};

function summaryLabel(preset: PresetSummary) {
  return `${preset.holes}H ${preset.wheelType} ${preset.crosses}x`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

export default function PresetBar({
  presets,
  selectedPresetId,
  currentParams,
  activePresetParams,
  onSelect,
  onSaveAs,
  onUpdate,
  onDelete,
  busy,
}: PresetBarProps) {
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const activeLabel = selectedPreset ? selectedPreset.name : null;
  const isModified =
    !!selectedPresetId &&
    !!activePresetParams &&
    stableStringify(currentParams) !== stableStringify(activePresetParams);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium uppercase text-slate-500">
            Presets
          </label>
          {activeLabel && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">Active preset: {activeLabel}</Badge>
              {isModified ? (
                <Badge variant="warn">Modified</Badge>
              ) : (
                <Badge variant="success">Saved</Badge>
              )}
            </div>
          )}
        </div>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={selectedPresetId ?? ""}
          onChange={(event) =>
            onSelect(event.target.value ? event.target.value : null)
          }
        >
          <option value="">Select a preset...</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} — {summaryLabel(preset)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSaveAs}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          disabled={busy}
        >
          Save as…
        </button>
        {selectedPresetId && isModified && (
          <button
            type="button"
            onClick={onUpdate}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            disabled={busy}
          >
            Update preset
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          disabled={!selectedPresetId || busy}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
