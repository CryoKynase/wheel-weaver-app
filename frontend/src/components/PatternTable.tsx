import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/Button";

import { trackEvent } from "../lib/analytics";
import type { PatternRow } from "../lib/types";
import type { TableColumnVisibility } from "../lib/tableSettings";

const baseColumns: ColumnDef<PatternRow>[] = [
  { accessorKey: "spoke", header: "Spoke" },
  { accessorKey: "order", header: "Order" },
  { accessorKey: "step", header: "Step" },
  { accessorKey: "side", header: "Side" },
  { accessorKey: "oddEvenSet", header: "Odd/Even Set" },
  { accessorKey: "k", header: "K" },
  { accessorKey: "hubHole", header: "Hub Hole" },
  { accessorKey: "heads", header: "Heads" },
  { accessorKey: "rimHole", header: "Rim Hole" },
  { accessorKey: "crossesDescribed", header: "Crosses" },
  { accessorKey: "notes", header: "Notes" },
];

type PatternTableProps = {
  rows: PatternRow[];
  printMode: boolean;
  onVisibleRowsChange?: (rows: PatternRow[]) => void;
  onHighlightRowsChange?: (rows: PatternRow[]) => void;
  onHoverSpokeChange?: (spoke: string | null) => void;
  sideFilter: "All" | "DS" | "NDS";
  columnVisibility: TableColumnVisibility;
  analyticsContext?: {
    holes?: number;
    crosses?: number;
    wheelType?: string;
    symmetry?: string;
  };
};

const orderedSteps = ["R1", "R2", "R3", "L1", "L3", "L4"];

const stickyColumns: Array<{ id: keyof PatternRow; width: number }> = [
  { id: "spoke", width: 96 },
  { id: "order", width: 64 },
  { id: "step", width: 64 },
  { id: "side", width: 64 },
];

const baseCsvHeaders: Array<keyof PatternRow> = [
  "spoke",
  "order",
  "step",
  "side",
  "oddEvenSet",
  "k",
  "hubHole",
  "heads",
  "rimHole",
  "crossesDescribed",
  "notes",
];

type HighlightMode = "current" | "visible";
type DisplayMode = "table" | "lookup";
type LookupType = "rim" | "hub" | "search";

const baseLookupFields: Array<{ key: keyof PatternRow; label: string }> = [
  { key: "spoke", label: "Spoke" },
  { key: "order", label: "Order" },
  { key: "step", label: "Step" },
  { key: "side", label: "Side" },
  { key: "oddEvenSet", label: "Odd/Even" },
  { key: "k", label: "K" },
  { key: "hubHole", label: "Hub hole" },
  { key: "heads", label: "Heads" },
  { key: "rimHole", label: "Rim hole" },
  { key: "crossesDescribed", label: "Crosses" },
  { key: "notes", label: "Notes" },
];

const defaultVisibility: Record<keyof PatternRow, boolean> = {
  spoke: true,
  order: true,
  step: true,
  side: true,
  oddEvenSet: true,
  k: true,
  hubHole: true,
  heads: true,
  rimHole: true,
  crossesDescribed: true,
  notes: true,
};

export default function PatternTable({
  rows,
  printMode,
  onVisibleRowsChange,
  onHighlightRowsChange,
  onHoverSpokeChange,
  sideFilter,
  columnVisibility,
  analyticsContext,
}: PatternTableProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(max-width: 768px)").matches ? "lookup" : "table";
    }
    return "table";
  });
  const [manualDisplayMode, setManualDisplayMode] = useState(false);
  const [stepFilter, setStepFilter] = useState("All");
  const [nextStepMode, setNextStepMode] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>("current");
  const [selectedSpoke, setSelectedSpoke] = useState<string | null>(null);
  const [lookupSide, setLookupSide] = useState<PatternRow["side"]>("DS");
  const [lookupType, setLookupType] = useState<LookupType>("rim");
  const [lookupValue, setLookupValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "order", desc: false },
  ]);
  const resolvedVisibility = useMemo<Record<keyof PatternRow, boolean>>(
    () => ({ ...defaultVisibility, ...columnVisibility }),
    [columnVisibility]
  );

  const stickyConfig = useMemo(() => {
    let left = 0;
    return stickyColumns.reduce<Record<string, { left: number; width: string }>>(
      (acc, column) => {
        if (!resolvedVisibility[column.id]) {
          return acc;
        }
        acc[column.id] = { left, width: `${column.width}px` };
        left += column.width;
        return acc;
      },
      {}
    );
  }, [resolvedVisibility]);

  const csvHeaders = useMemo(
    () => baseCsvHeaders.filter((key) => resolvedVisibility[key]),
    [resolvedVisibility]
  );

  const lookupFields = useMemo(
    () => baseLookupFields.filter((field) => resolvedVisibility[field.key]),
    [resolvedVisibility]
  );

  useEffect(() => {
    if (printMode) {
      setDisplayMode("table");
    }
  }, [printMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    if (manualDisplayMode || printMode) {
      return undefined;
    }
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateDisplayMode = () => {
      setDisplayMode(mediaQuery.matches ? "lookup" : "table");
    };
    updateDisplayMode();
    mediaQuery.addEventListener("change", updateDisplayMode);
    return () => {
      mediaQuery.removeEventListener("change", updateDisplayMode);
    };
  }, [manualDisplayMode, printMode]);

  const stepOptions = useMemo(() => {
    const steps = Array.from(new Set(rows.map((row) => row.step)));
    return ["All", ...steps];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (sideFilter !== "All" && row.side !== sideFilter) {
        return false;
      }
      if (!nextStepMode && stepFilter !== "All" && row.step !== stepFilter) {
        return false;
      }
      return true;
    });
  }, [rows, sideFilter, stepFilter, nextStepMode]);

  const availableSteps = useMemo(() => {
    return orderedSteps.filter((step) =>
      filteredRows.some((row) => row.step === step)
    );
  }, [filteredRows]);

  useEffect(() => {
    if (!nextStepMode) {
      setActiveStep(null);
      return;
    }
    if (!availableSteps.length) {
      setActiveStep(null);
      return;
    }
    if (!activeStep || !availableSteps.includes(activeStep)) {
      setActiveStep(availableSteps[0]);
    }
  }, [availableSteps, activeStep, nextStepMode]);

  useEffect(() => {
    if (!nextStepMode) {
      return;
    }
    if (activeStep && stepFilter !== activeStep) {
      setStepFilter(activeStep);
    }
  }, [activeStep, nextStepMode, stepFilter]);

  const visibleRows = useMemo(() => {
    if (!nextStepMode || !activeStep) {
      return filteredRows;
    }
    return filteredRows.filter((row) => row.step === activeStep);
  }, [filteredRows, nextStepMode, activeStep]);

  const highlightRows = useMemo(() => {
    if (highlightMode === "visible") {
      return visibleRows;
    }
    if (nextStepMode && activeStep) {
      return visibleRows;
    }
    if (stepFilter !== "All") {
      return filteredRows;
    }
    return filteredRows.filter((row) => row.step === "R1");
  }, [
    activeStep,
    filteredRows,
    highlightMode,
    nextStepMode,
    stepFilter,
    visibleRows,
  ]);

  useEffect(() => {
    onVisibleRowsChange?.(visibleRows);
  }, [onVisibleRowsChange, visibleRows]);

  useEffect(() => {
    onHighlightRowsChange?.(highlightRows);
  }, [highlightRows, onHighlightRowsChange]);

  const lookupNumbers = useMemo(() => {
    const relevant = rows.filter((row) => row.side === lookupSide);
    const rim = Array.from(new Set(relevant.map((row) => row.rimHole))).sort(
      (a, b) => a - b
    );
    const hub = Array.from(new Set(relevant.map((row) => row.hubHole))).sort(
      (a, b) => a - b
    );
    return { rim, hub };
  }, [lookupSide, rows]);

  useEffect(() => {
    if (lookupType === "search") {
      return;
    }
    const numbers = lookupType === "rim" ? lookupNumbers.rim : lookupNumbers.hub;
    if (!numbers.length) {
      setLookupValue("");
      return;
    }
    const numericValue = Number(lookupValue);
    if (!lookupValue || Number.isNaN(numericValue)) {
      setLookupValue(String(numbers[0]));
      return;
    }
    if (!numbers.includes(numericValue)) {
      setLookupValue(String(numbers[0]));
    }
  }, [lookupNumbers, lookupType, lookupValue]);

  const lookupMatches = useMemo(() => {
    if (lookupType === "search") {
      const normalized = searchValue.trim().toLowerCase();
      if (!normalized) {
        return [];
      }
      const numericValue = Number(normalized);
      return rows.filter((row) => {
        if (row.side !== lookupSide) {
          return false;
        }
        const spokeMatch = row.spoke.toLowerCase().includes(normalized);
        const orderMatch =
          !Number.isNaN(numericValue) && row.order === numericValue;
        return spokeMatch || orderMatch;
      });
    }
    if (!lookupValue) {
      return [];
    }
    const numericValue = Number(lookupValue);
    if (Number.isNaN(numericValue)) {
      return [];
    }
    return rows.filter((row) => {
      if (row.side !== lookupSide) {
        return false;
      }
      return lookupType === "rim"
        ? row.rimHole === numericValue
        : row.hubHole === numericValue;
    });
  }, [lookupSide, lookupType, lookupValue, rows, searchValue]);

  const lookupRow = lookupMatches[0] ?? null;

  const table = useReactTable({
    data: visibleRows,
    columns: baseColumns,
    state: { sorting, columnVisibility: resolvedVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExport = () => {
    const rowsForExport = table.getRowModel().rows.map((row) => row.original);
    const lines = [
      csvHeaders.join(","),
      ...rowsForExport.map((row) =>
        csvHeaders
          .map((key) => {
            const value = row[key as keyof PatternRow];
            const cell = value == null ? "" : String(value);
            const escaped = cell.replace(/"/g, '""');
            return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pattern.csv";
    link.click();
    URL.revokeObjectURL(url);
    trackEvent("pattern_export_csv", {
      row_count: rowsForExport.length,
      holes: analyticsContext?.holes,
      crosses: analyticsContext?.crosses,
      wheel_type: analyticsContext?.wheelType,
      symmetry: analyticsContext?.symmetry,
    });
  };

  const stepIndex = activeStep ? availableSteps.indexOf(activeStep) : -1;
  const nextActionRow = table.getRowModel().rows[0]?.original ?? null;

  const handleRowSelect = (spoke: string) => {
    setSelectedSpoke(spoke);
    onHoverSpokeChange?.(spoke);
  };

  const handleRowLeave = () => {
    onHoverSpokeChange?.(selectedSpoke);
  };

  const handleStepPrev = () => {
    if (!availableSteps.length) {
      return;
    }
    if (!nextStepMode || stepIndex < 0) {
      setNextStepMode(true);
      setActiveStep(availableSteps[0]);
      return;
    }
    setActiveStep(availableSteps[Math.max(0, stepIndex - 1)]);
  };

  const handleStepNext = () => {
    if (!availableSteps.length) {
      return;
    }
    if (!nextStepMode || stepIndex < 0) {
      setNextStepMode(true);
      setActiveStep(availableSteps[0]);
      return;
    }
    setActiveStep(
      availableSteps[Math.min(availableSteps.length - 1, stepIndex + 1)]
    );
  };

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-b-primary/30 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {!printMode && (
              <>
                <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1">
                  {(["table", "lookup"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setManualDisplayMode(true);
                        setDisplayMode(mode);
                      }}
                      variant="ghost"
                      size="sm"
                      className={`h-7 rounded-full px-3 text-xs font-medium ${
                        displayMode === mode
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                      }`}
                    >
                      {mode === "table" ? "Full table" : "Compact lookup"}
                    </Button>
                  ))}
                </div>
                {displayMode === "table" && (
                  <>
                    <Button
                      type="button"
                      onClick={handleExport}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      Export CSV
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setNextStepMode((prev) => !prev)}
                      variant="outline"
                      size="sm"
                      className={`h-7 text-xs ${
                        nextStepMode
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                      }`}
                    >
                      Next step mode
                    </Button>
                    {nextStepMode && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleStepPrev}
                          disabled={
                            !availableSteps.length ||
                            (stepIndex <= 0 && stepIndex !== -1)
                          }
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Prev step
                        </Button>
                        <Button
                          type="button"
                          onClick={handleStepNext}
                          disabled={
                            !availableSteps.length ||
                            (stepIndex >= availableSteps.length - 1 &&
                              stepIndex !== -1)
                          }
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          Next step
                        </Button>
                        {activeStep && (
                          <span className="text-xs text-slate-500">
                            Showing {activeStep}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          {displayMode === "table" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Highlight</span>
              {(["current", "visible"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  onClick={() => setHighlightMode(mode)}
                  variant="outline"
                  size="sm"
                  className={`h-7 rounded-full px-3 text-xs font-medium ${
                    highlightMode === mode
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  {mode === "current" ? "Current step" : "Visible rows"}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {displayMode === "table" && (
        <>
          <div className="flex flex-wrap items-center gap-3 no-print">
            <div className="flex items-center gap-2">
              {stepOptions.map((step) => (
                <Button
                  key={step}
                  onClick={() => {
                    setStepFilter(step);
                    if (nextStepMode) {
                      if (step === "All") {
                        setNextStepMode(false);
                      } else {
                        setActiveStep(step);
                      }
                    }
                  }}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-7 rounded-full px-3 text-xs font-medium ${
                    stepFilter === step
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  {step}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table
              className={`w-full min-w-[720px] text-left ${printMode ? "text-sm" : "text-xs"}`}
            >
              <thead className="sticky top-0 z-10 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sticky = stickyConfig[header.id];
                      return (
                        <th
                          key={header.id}
                          className={`whitespace-nowrap border-b border-border px-3 py-2 ${
                            sticky ? "sticky z-20 bg-muted/50" : ""
                          }`}
                          style={
                            sticky
                              ? { left: `${sticky.left}px`, minWidth: sticky.width }
                              : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : header.column.columnDef.header?.toString()}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const highlight = row.original.notes.includes("Reference");
                  const isSelected = row.original.spoke === selectedSpoke;
                  return (
                    <tr
                      key={row.id}
                      className={`${highlight ? "bg-amber-50" : ""} ${
                        isSelected ? "border-l-4 border-l-primary/40 bg-primary/5" : ""
                      }`}
                      onMouseEnter={() => onHoverSpokeChange?.(row.original.spoke)}
                      onMouseLeave={handleRowLeave}
                      onClick={() => handleRowSelect(row.original.spoke)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleRowSelect(row.original.spoke);
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const sticky = stickyConfig[cell.column.id];
                        const isNotes = cell.column.id === "notes";
                        return (
                          <td
                            key={cell.id}
                            className={`border-b border-slate-100 px-3 py-2 ${
                              isNotes ? "whitespace-normal" : "whitespace-nowrap"
                            } ${
                              sticky
                                ? isSelected
                                  ? "sticky z-10 bg-primary/5"
                                  : "sticky z-10 bg-white"
                                : ""
                            }`}
                            style={
                              sticky
                                ? { left: `${sticky.left}px`, minWidth: sticky.width }
                                : undefined
                            }
                          >
                            {String(cell.getValue() ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {displayMode === "lookup" && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Compact lookup
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleStepPrev}
              variant="outline"
              size="sm"
              className="h-11 px-4 text-xs"
            >
              Prev step
            </Button>
            <Button
              type="button"
              onClick={handleStepNext}
              variant="outline"
              size="sm"
              className="h-11 px-4 text-xs"
            >
              Next step
            </Button>
            {activeStep && (
              <span className="text-xs text-slate-500">Showing {activeStep}</span>
            )}
          </div>
          {nextActionRow && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">
                Next spoke action
              </div>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-500">
                    Spoke
                  </span>
                  <div className="font-medium text-slate-900">
                    {nextActionRow.spoke}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500">
                    Hub hole
                  </span>
                  <div className="font-medium text-slate-900">
                    {nextActionRow.hubHole}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500">
                    Rim hole
                  </span>
                  <div className="font-medium text-slate-900">
                    {nextActionRow.rimHole}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] uppercase text-slate-500">
                    Notes
                  </span>
                  <div className="font-medium text-slate-900">
                    {nextActionRow.notes || "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {(["DS", "NDS"] as const).map((side) => (
                <Button
                  key={side}
                  type="button"
                  onClick={() => setLookupSide(side)}
                  variant="outline"
                  size="sm"
                  className={`h-11 rounded-full px-3 text-xs font-medium ${
                    lookupSide === side
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  {side}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {(["rim", "hub", "search"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => setLookupType(type)}
                  variant="outline"
                  size="sm"
                  className={`h-11 rounded-full px-3 text-xs font-medium ${
                    lookupType === type
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  {type === "rim"
                    ? "Rim hole"
                    : type === "hub"
                      ? "Hub hole"
                      : "Spoke/Order"}
                </Button>
              ))}
            </div>
            {lookupType === "search" ? (
              <label className="text-xs font-medium text-slate-600">
                Spoke or order
                <input
                  className="ml-2 w-36 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="e.g. 12 or R1-3"
                />
              </label>
            ) : (
              <label className="text-xs font-medium text-slate-600">
                Hole number
                <select
                  className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  value={lookupValue}
                  onChange={(event) => setLookupValue(event.target.value)}
                  disabled={
                    (lookupType === "rim"
                      ? lookupNumbers.rim
                      : lookupNumbers.hub
                    ).length === 0
                  }
                >
                  {(lookupType === "rim"
                    ? lookupNumbers.rim
                    : lookupNumbers.hub
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="mt-4">
            {lookupRow ? (
              <>
                {lookupMatches.length > 1 && (
                  <div className="mb-3 text-xs text-amber-600">
                    Multiple matches found. Showing the first.
                  </div>
                )}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Lookup result
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 px-3 text-xs"
                    onClick={() => handleRowSelect(lookupRow.spoke)}
                  >
                    Highlight in diagram
                  </Button>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {lookupFields.map((field) => (
                    <div
                      key={field.key}
                      className={`rounded-md border border-slate-200 px-3 py-2 ${
                        field.key === "notes" ? "sm:col-span-2" : ""
                      }`}
                    >
                      <dt className="text-[10px] uppercase text-slate-500">
                        {field.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-slate-900">
                        {String(lookupRow[field.key] ?? "")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <div className="text-sm text-slate-500">
                No row found for this selection.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
