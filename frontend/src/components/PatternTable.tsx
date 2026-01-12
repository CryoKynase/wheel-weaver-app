import { useMemo, useState } from "react";
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
};

export default function PatternTable({ rows }: PatternTableProps) {
  const [sideFilter, setSideFilter] = useState("All");
  const [stepFilter, setStepFilter] = useState("All");
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

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-2"
                  >
                    {header.isPlaceholder
                      ? null
                      : header.column.columnDef.header?.toString()}
                  </th>
                ))}
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap border-b border-slate-100 px-3 py-2"
                    >
                      {String(cell.getValue() ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
