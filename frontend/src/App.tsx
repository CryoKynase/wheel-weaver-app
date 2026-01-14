import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useMatch, useNavigate } from "react-router-dom";
import Builder from "./routes/Builder";
import Readme from "./routes/Readme";
import Settings from "./routes/Settings";
import { defaultPatternRequest } from "./lib/defaults";
import { holeOptions, isHoleOption } from "./lib/holeOptions";
import {
  defaultTableColumnVisibility,
  type TableColumnVisibility,
} from "./lib/tableSettings";
import { Toaster } from "@/components/ui/toaster";

const linkBase =
  "block rounded-md px-3 py-2 text-sm font-medium transition";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${linkBase} ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:bg-slate-100"
  }`;

export default function App() {
  const navigate = useNavigate();
  const builderMatch = useMatch("/builder/:holes");
  const [selectedHoles, setSelectedHoles] = useState(
    defaultPatternRequest.holes
  );
  const [tableColumns, setTableColumns] = useState<TableColumnVisibility>(
    defaultTableColumnVisibility
  );

  useEffect(() => {
    const param = builderMatch?.params.holes ?? "";
    const parsed = Number(param);
    if (Number.isNaN(parsed) || !isHoleOption(parsed)) {
      return;
    }
    setSelectedHoles(parsed);
  }, [builderMatch?.params.holes]);

  const builderPath = useMemo(
    () => `/builder/${selectedHoles}`,
    [selectedHoles]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-lg font-semibold">Wheel Lacing</div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                Holes
                <select
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={selectedHoles}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next) || !isHoleOption(next)) {
                      return;
                    }
                    setSelectedHoles(next);
                    navigate(`/builder/${next}`);
                  }}
                >
                  {holeOptions.map((holes) => (
                    <option key={holes} value={holes}>
                      {holes}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              <NavLink to={builderPath} className={navLinkClass}>
                Builder
              </NavLink>
              <NavLink to="/readme" className={navLinkClass}>
                Readme
              </NavLink>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="p-6">
          <div className="w-full max-w-none">
            <Routes>
              <Route
                path="/"
                element={
                  <Navigate
                    to={`/builder/${defaultPatternRequest.holes}`}
                    replace
                  />
                }
              />
              <Route
                path="/builder"
                element={
                  <Navigate
                    to={`/builder/${defaultPatternRequest.holes}`}
                    replace
                  />
                }
              />
              <Route
                path="/builder/:holes"
                element={
                  <Builder tableColumns={tableColumns} />
                }
              />
              <Route path="/readme" element={<Readme />} />
              <Route
                path="/settings"
                element={
                  <Settings
                    tableColumns={tableColumns}
                    onTableColumnsChange={setTableColumns}
                  />
                }
              />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
