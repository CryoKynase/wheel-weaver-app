import { useCallback, useState } from "react";

import ParamPanel from "../components/ParamPanel";
import PatternTable from "../components/PatternTable";
import { computePattern } from "../lib/api";
import { defaultPatternRequest } from "../lib/defaults";
import type { PatternRequest, PatternResponse } from "../lib/types";

export default function Builder() {
  const [data, setData] = useState<PatternResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParamsChange = useCallback(async (params: PatternRequest) => {
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
          Defaults: {defaultPatternRequest.holes}H {defaultPatternRequest.crosses}x
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit lg:sticky lg:top-6">
          <ParamPanel onParamsChange={handleParamsChange} />
        </aside>
        <div className="space-y-4">
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
