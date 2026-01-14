import { useMemo, useState } from "react";
import type { PatternRequest, PresetSummary } from "../lib/types";
import Badge from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type PresetBarProps = {
  presets: PresetSummary[];
  selectedPresetId: string | null;
  currentParams: PatternRequest;
  activePresetParams: PatternRequest | null;
  presetError?: string | null;
  onSelect: (id: string | null) => void;
  onSaveAs: (name: string) => void;
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
  presetError,
  onSelect,
  onSaveAs,
  onUpdate,
  onDelete,
  busy,
}: PresetBarProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const activeLabel = selectedPreset ? selectedPreset.name : null;
  const isDirty = useMemo(() => {
    if (!selectedPresetId || !activePresetParams) {
      return false;
    }
    return (
      stableStringify(currentParams) !== stableStringify(activePresetParams)
    );
  }, [activePresetParams, currentParams, selectedPresetId]);

  const handleOpenSave = () => {
    setPresetName(selectedPreset?.name ?? "");
    setNameError(null);
    setSaveOpen(true);
  };

  const handleSave = () => {
    const trimmed = presetName.trim();
    if (!trimmed) {
      setNameError("Preset name is required.");
      return;
    }
    onSaveAs(trimmed);
    setSaveOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setDeleteOpen(false);
  };

  const hasActivePreset = Boolean(selectedPresetId);

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border bg-background px-4 py-3 ${
        hasActivePreset ? "border-l-4 border-l-primary/40 border-border" : "border-border"
      }`}
    >
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {activeLabel ? (
            <>
              <Badge variant="neutral" className="bg-primary/10 text-foreground">
                <span className="max-w-[200px] truncate">
                  Active preset: {activeLabel}
                </span>
              </Badge>
              {isDirty ? (
                <Badge variant="warn">Modified</Badge>
              ) : (
                <Badge variant="success">Saved</Badge>
              )}
            </>
          ) : (
            <Badge variant="neutral">No preset selected</Badge>
          )}
        </div>
        {presetError && (
          <div className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {presetError}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium uppercase text-slate-500">
            Presets
          </label>
        </div>
        <select
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent/40"
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenSave}
          disabled={busy}
        >
          Save as…
        </Button>
        {selectedPresetId && isDirty && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUpdate}
            disabled={busy}
          >
            Update preset
          </Button>
        )}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!selectedPresetId || busy}
            >
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete preset?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove{" "}
                <span className="font-semibold">{activeLabel ?? "this preset"}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={busy}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save preset</DialogTitle>
            <DialogDescription>
              Give this configuration a name to reuse later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name"
              disabled={busy}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
