import type { ReactNode } from "react";
import { LayoutGrid, LayoutList, SquareSplitHorizontal } from "lucide-react";

const options = [
  { value: "table", label: "Table", Icon: LayoutList },
  { value: "diagram", label: "Diagram", Icon: LayoutGrid },
  { value: "both", label: "Both", Icon: SquareSplitHorizontal },
] as const;

export type SegmentedValue = (typeof options)[number]["value"];

export type SegmentedProps = {
  value: SegmentedValue;
  onChange: (value: SegmentedValue) => void;
  showIcons?: boolean;
  className?: string;
  label?: ReactNode;
};

export default function Segmented({
  value,
  onChange,
  showIcons = true,
  className = "",
  label,
}: SegmentedProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      )}
      <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
        {options.map(({ value: option, label: optionLabel, Icon }) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {showIcons && <Icon className="h-3.5 w-3.5" />}
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
