import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ComputeStatus from "../components/ComputeStatus";
import FlowDiagram from "../components/FlowDiagram";
import ParamPanel from "../components/ParamPanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { computePattern } from "../lib/api";
import { defaultPatternRequest } from "../lib/defaults";
import { isHoleOption } from "../lib/holeOptions";
import { normalizeParamsForHoles } from "../lib/pattern";
import { trackEvent } from "../lib/analytics";
import type { PatternRequest, PatternResponse } from "../lib/types";

const zoomLevels = [0.6, 0.8, 1, 1.2, 1.4, 1.6];

export default function Flow() {
  const navigate = useNavigate();
  const { holes: holesParam } = useParams();
  const parsedHoles = Number(holesParam);
  const hasValidHolesParam = isHoleOption(parsedHoles);
  const holes = hasValidHolesParam
    ? parsedHoles
    : defaultPatternRequest.holes;
  const [data, setData] = useState<PatternResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentParams, setCurrentParams] = useState<PatternRequest>(() =>
    normalizeParamsForHoles(defaultPatternRequest, holes)
  );
  const [seedValues, setSeedValues] = useState<PatternRequest>(() =>
    normalizeParamsForHoles(defaultPatternRequest, holes)
  );
  const [sideFilter, setSideFilter] = useState<"All" | "DS" | "NDS">("All");
  const [zoomIndex, setZoomIndex] = useState(2);
  const svgRef = useRef<SVGSVGElement>(null);

  const zoom = zoomLevels[zoomIndex] ?? 1;

  const filteredRows = useMemo(() => {
    if (!data) {
      return [];
    }
    if (sideFilter === "All") {
      return data.rows;
    }
    return data.rows.filter((row) => row.side === sideFilter);
  }, [data, sideFilter]);

  const handleParamsChange = useCallback(async (params: PatternRequest) => {
    setCurrentParams(params);
    setLoading(true);
    setError(null);
    try {
      const response = await computePattern(params);
      setData(response);
      setLastUpdated(new Date());
      trackEvent("pattern_generated", {
        holes: params.holes,
        crosses: params.crosses,
        wheel_type: params.wheelType,
        symmetry: params.symmetry,
        invert_heads: params.invertHeads,
        view: "flow",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [currentParams]);

  useEffect(() => {
    if (!holesParam || hasValidHolesParam) {
      return;
    }
    navigate(`/flow/${defaultPatternRequest.holes}`, { replace: true });
  }, [hasValidHolesParam, holesParam, navigate]);

  useEffect(() => {
    setSeedValues((prev) => normalizeParamsForHoles(prev, holes));
    setCurrentParams((prev) => normalizeParamsForHoles(prev, holes));
  }, [holes]);

  const handleOpenPrintView = useCallback(() => {
    const svg = svgRef.current?.outerHTML;
    if (!svg) {
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }
    printWindow.opener = null;
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Wheel Weaver Flow</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; background: #fff; font-family: "Segoe UI", system-ui, sans-serif; }
      .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12mm;
        box-sizing: border-box;
      }
      .flow-wrap {
        width: min(1200px, 100%);
        margin: 0 auto;
      }
      svg { width: 100% !important; height: auto !important; display: block; }
      @media print {
        @page { size: auto; margin: 12mm; }
        body { margin: 0; }
        .page { padding: 0; min-height: auto; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="flow-wrap">
        ${svg}
      </div>
    </div>
  </body>
</html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    trackEvent("flow_print_view", {
      holes: currentParams.holes,
      crosses: currentParams.crosses,
      wheel_type: currentParams.wheelType,
    });
  }, [currentParams]);

  const handleDownloadSvg = useCallback(() => {
    const svg = svgRef.current?.outerHTML;
    if (!svg) {
      return;
    }
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wheel-lacing-flow.svg";
    link.click();
    URL.revokeObjectURL(url);
    trackEvent("flow_download_svg", {
      holes: currentParams.holes,
      crosses: currentParams.crosses,
      wheel_type: currentParams.wheelType,
    });
  }, []);

  const paramSummary = useMemo(
    () =>
      `${currentParams.holes}H - ${currentParams.wheelType} - ${
        currentParams.crosses
      }x - ${currentParams.symmetry} - ${
        currentParams.invertHeads ? "invert heads" : "default heads"
      }`,
    [currentParams]
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Flow</h1>
          <p className="text-sm text-slate-600">
            Step-by-step flowchart for lacing from the valve reference point.
          </p>
        </div>
        <div className="text-xs text-slate-500">{paramSummary}</div>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:space-y-0">
        <aside className="space-y-4">
          <div className="space-y-3 lg:hidden">
            <Card>
              <details className="group">
                <summary className="cursor-pointer px-4 pb-3 pt-4 text-sm font-semibold text-slate-900">
                  Parameters
                </summary>
                <div className="px-4 pb-4">
                  <ParamPanel
                    holes={holes}
                    onParamsChange={handleParamsChange}
                    initialValues={seedValues}
                    sideFilter={sideFilter}
                    onSideFilterChange={setSideFilter}
                  />
                </div>
              </details>
            </Card>
          </div>
          <div className="hidden space-y-4 lg:block lg:sticky lg:top-20">
            <Card>
              <CardContent className="pt-4">
                <ParamPanel
                  holes={holes}
                  onParamsChange={handleParamsChange}
                  initialValues={seedValues}
                  sideFilter={sideFilter}
                  onSideFilterChange={setSideFilter}
                />
              </CardContent>
            </Card>
          </div>
        </aside>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setZoomIndex((idx) => Math.max(0, idx - 1))
                }
              >
                Zoom out
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setZoomIndex((idx) =>
                    Math.min(zoomLevels.length - 1, idx + 1)
                  )
                }
              >
                Zoom in
              </Button>
              <span className="text-xs text-slate-500">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPrintView}
              >
                Open Print View
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownloadSvg}
              >
                Download SVG
              </Button>
            </div>
          </div>

          <ComputeStatus
            loading={loading}
            error={error}
            rowCount={data?.rows.length ?? null}
            lastUpdated={lastUpdated}
            onRetry={() => handleParamsChange(currentParams)}
          />

          {error && (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {error}
            </div>
          )}

          {loading && !data && (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Calculating flow…
            </div>
          )}

          {data ? (
            <div className="overflow-auto rounded-md border border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-220px)]">
              <div className="flex justify-center">
                <FlowDiagram
                  params={currentParams}
                  rows={filteredRows}
                  zoom={zoom}
                  svgRef={svgRef}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Pick your wheel basics to generate a flowchart.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
