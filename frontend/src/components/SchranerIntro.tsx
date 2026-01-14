import { useEffect, useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "schranerIntroExpanded";

export default function SchranerIntro() {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Button
          type="button"
          onClick={toggle}
          variant="ghost"
          className="h-auto w-full flex-col items-start justify-start gap-1 p-0 text-left hover:bg-transparent"
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          <div className="text-sm font-semibold text-slate-900">
            Schraner workshop method
          </div>
          <p className="mt-1 text-sm text-slate-700">
            Anchor the build at the valve with two reference spokes, then lace in
            a fixed sequence (R1 to R2 to R3 to L1 to L3 to L4).
          </p>
        </Button>
        <Button
          type="button"
          onClick={toggle}
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2"
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          {expanded ? "Hide" : "Show"}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <div
        id={contentId}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="mt-3 text-sm text-slate-600">
          Schraner teaches wheel lacing as a repeatable workshop sequence: you
          anchor the build at the valve with two reference spokes, then complete
          the wheel in predictable phases (R1 to R2 to R3 to L1 to L3 to L4) by
          filling "odd" and "even" sets on each flange. This app mirrors that
          process: the table is ordered exactly as you would lace at the bench,
          and tools like Next Step mode, filters, and the diagram are designed to
          show only what you need for the phase you're currently doing.
        </p>
      </div>
    </section>
  );
}
