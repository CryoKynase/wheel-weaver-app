import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { PatternRow } from "../lib/types";
import type { TableColumnVisibility } from "../lib/tableSettings";

const baseColumns: ColumnDef<PatternRow>[] = [
  { accessorKey: "spoke", header: "spoke" },
  { accessorKey: "order", header: "order" },
  { accessorKey: "step", header: "step" },
  { accessorKey: "side", header: "side" },
  { accessorKey: "oddEvenSet", header: "oddEvenSet" },
  { accessorKey: "k", header: "k" },
  { accessorKey: "hubHole", header: "hubHole" },
  { accessorKey: "heads", header: "heads" },
  { accessorKey: "rimHole", header: "rimHole" },
  { accessorKey: "crossesDescribed", header: "crossesDescribed" },
  { accessorKey: "notes", header: "notes" },
];

type PatternTableProps = {
  rows: PatternRow[];
  printMode: boolean;
  onVisibleRowsChange?: (rows: PatternRow[]) => void;
  onHighlightRowsChange?: (rows: PatternRow[]) => void;
  onHoverSpokeChange?: (spoke: string | null) => void;
  sideFilter: "All" | "DS" | "NDS";
  columnVisibility: TableColumnVisibility;
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

export default function PatternTable({
  rows,
  printMode,
  onVisibleRowsChange,
  onHighlightRowsChange,
  onHoverSpokeChange,
  sideFilter,
  columnVisibility,
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
  const [lookupSide, setLookupSide] = useState<PatternRow["side"]>("DS");
  const [lookupType, setLookupType] = useState<LookupType>("rim");
  const [lookupValue, setLookupValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "order", desc: false },
  ]);
  const resolvedVisibility = useMemo<Record<keyof PatternRow, boolean>>(
    () => ({
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
      ...columnVisibility,
    }),
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
      if (stepFilter !== "All" && row.step !== stepFilter) {
        return false;
      }
      return true;
    });
  }, [rows, sideFilter, stepFilter]);

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
  };

  const stepIndex = activeStep ? availableSteps.indexOf(activeStep) : -1;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          {!printMode && (
            <>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
                {(["table", "lookup"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setManualDisplayMode(true);
                      setDisplayMode(mode);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      displayMode === mode
                        ? "bg-slate-900 text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {mode === "table" ? "Full table" : "Compact lookup"}
                  </button>
                ))}
              </div>
              {displayMode === "table" && (
                <>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setNextStepMode((prev) => !prev)}
                    className={`rounded-md border px-3 py-2 text-xs font-medium ${
                      nextStepMode
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Next step mode
                  </button>
                  {nextStepMode && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep(availableSteps[stepIndex - 1])}
                        disabled={stepIndex <= 0}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50"
                      >
                        Prev step
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStep(availableSteps[stepIndex + 1])
                        }
                        disabled={
                          stepIndex < 0 || stepIndex >= availableSteps.length - 1
                        }
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50"
                      >
                        Next step
                      </button>
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
              <button
                key={mode}
                type="button"
                onClick={() => setHighlightMode(mode)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  highlightMode === mode
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {mode === "current" ? "Current step" : "Visible rows"}
              </button>
            ))}
          </div>
        )}
      </div>

      {displayMode === "table" && (
        <>
          <div className="flex flex-wrap items-center gap-3 no-print">
            <div className="flex items-center gap-2">
              {stepOptions.map((step) => (
                <button
                  key={step}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    stepFilter === step
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => setStepFilter(step)}
                  type="button"
                >
                  {step}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table
              className={`w-full min-w-[720px] text-left ${printMode ? "text-sm" : "text-xs"}`}
            >
              <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sticky = stickyConfig[header.id];
                      return (
                        <th
                          key={header.id}
                          className={`whitespace-nowrap border-b border-slate-200 px-3 py-2 ${
                            sticky ? "sticky z-20 bg-slate-100" : ""
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
                  return (
                    <tr
                      key={row.id}
                      className={highlight ? "bg-amber-50" : ""}
                      onMouseEnter={() => onHoverSpokeChange?.(row.original.spoke)}
                      onMouseLeave={() => onHoverSpokeChange?.(null)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const sticky = stickyConfig[cell.column.id];
                        const isNotes = cell.column.id === "notes";
                        return (
                          <td
                            key={cell.id}
                            className={`border-b border-slate-100 px-3 py-2 ${
                              isNotes ? "whitespace-normal" : "whitespace-nowrap"
                            } ${sticky ? "sticky z-10 bg-white" : ""}`}
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
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {(["DS", "NDS"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setLookupSide(side)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    lookupSide === side
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {(["rim", "hub", "search"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLookupType(type)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    lookupType === type
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {type === "rim"
                    ? "Rim hole"
                    : type === "hub"
                      ? "Hub hole"
                      : "Spoke/Order"}
                </button>
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
