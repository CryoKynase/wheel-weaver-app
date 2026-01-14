import type { ReactNode } from "react";

export type ComputeStatusProps = {
  loading: boolean;
  error?: string | null;
  rowCount?: number | null;
  lastUpdated?: Date | null;
  onRetry?: () => void;
  className?: string;
  children?: ReactNode;
};

export default function ComputeStatus({
  loading,
  error,
  rowCount,
  lastUpdated,
  onRetry,
  className = "",
}: ComputeStatusProps) {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-slate-600 ${className}`}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        Loading pattern...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 ${className}`}
      >
        <span>{error}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (rowCount != null) {
    const time = lastUpdated
      ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;
    return (
      <div className={`text-xs text-slate-500 ${className}`}>
        {time ? `Updated ${time} · ` : ""}{rowCount} rows
      </div>
    );
  }

  return null;
}
