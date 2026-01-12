import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { fetchReadme } from "../lib/api";

export default function Readme() {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchReadme()
      .then((data) => {
        if (!active) return;
        setMarkdown(data.markdown);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unexpected error");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Readme</h1>
        <Link
          to="/"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Open Builder
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-600">Loading readme...</p>}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <article className="prose max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      )}
    </section>
  );
}
