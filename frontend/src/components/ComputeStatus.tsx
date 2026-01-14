import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

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
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground/70" />
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
          <Button
            type="button"
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="h-7 border-destructive/40 text-destructive hover:text-destructive"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (rowCount != null) {
    return null;
  }

  return null;
}
