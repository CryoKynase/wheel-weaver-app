import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { PatternRow } from "../lib/types";

const columns: ColumnDef<PatternRow>[] = [
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
};

const orderedSteps = ["R1", "R2", "R3", "L1", "L3", "L4"];

const stickyConfig: Record<string, { left: number; width: string }> = {
  spoke: { left: 0, width: "96px" },
  order: { left: 96, width: "64px" },
  step: { left: 160, width: "64px" },
  side: { left: 224, width: "64px" },
};

const csvHeaders = [
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

export default function PatternTable({
  rows,
  printMode,
  onVisibleRowsChange,
}: PatternTableProps) {
  const [sideFilter, setSideFilter] = useState("All");
  const [stepFilter, setStepFilter] = useState("All");
  const [nextStepMode, setNextStepMode] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "order", desc: false },
  ]);

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

  useEffect(() => {
    onVisibleRowsChange?.(visibleRows);
  }, [onVisibleRowsChange, visibleRows]);

  const table = useReactTable({
    data: visibleRows,
    columns,
    state: { sorting },
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
                onClick={() => setActiveStep(availableSteps[stepIndex + 1])}
                disabled={stepIndex < 0 || stepIndex >= availableSteps.length - 1}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50"
              >
                Next step
              </button>
              {activeStep && (
                <span className="text-xs text-slate-500">Showing {activeStep}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          {(["All", "DS", "NDS"] as const).map((side) => (
            <button
              key={side}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                sideFilter === side
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => setSideFilter(side)}
              type="button"
            >
              {side}
            </button>
          ))}
        </div>
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

      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className={`min-w-full text-left ${printMode ? "text-sm" : "text-xs"}`}>
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
                <tr key={row.id} className={highlight ? "bg-amber-50" : ""}>
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
    </section>
  );
}
