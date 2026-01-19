import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";
import Builder from "./routes/Builder";
import Flow from "./routes/Flow";
import Readme from "./routes/Readme";
import About from "./routes/About";
import Settings from "./routes/Settings";
import Privacy from "./routes/Privacy";
import { defaultPatternRequest } from "./lib/defaults";
import { holeOptions, isHoleOption } from "./lib/holeOptions";
import {
  defaultTableColumnVisibility,
  type TableColumnVisibility,
} from "./lib/tableSettings";
import {
  accentThemes,
  defaultAccentThemeId,
  type AccentThemeId,
} from "./lib/theme";
import { Toaster } from "@/components/ui/toaster";
import ConsentBanner from "./components/ConsentBanner";
import { initializeAnalytics, trackPageView } from "./lib/analytics";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const linkBase =
  "block rounded-md border border-transparent px-3 py-2 text-sm font-medium transition";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${linkBase} ${
    isActive
      ? "border-primary/30 bg-primary/10 text-foreground"
      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
  }`;

const STORED_HOLES_KEY = "wheelweaver:selectedHoles";

const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-11 w-full items-center rounded-md border px-3 text-sm font-medium transition ${
    isActive
      ? "border-primary/40 bg-primary/10 text-foreground"
      : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
  }`;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const builderMatch = useMatch("/builder/:holes");
  const flowMatch = useMatch("/flow/:holes");
  const [selectedHoles, setSelectedHoles] = useState(
    defaultPatternRequest.holes
  );
  const [tableColumns, setTableColumns] = useState<TableColumnVisibility>(
    defaultTableColumnVisibility
  );
  const [accentThemeId, setAccentThemeId] = useState<AccentThemeId>(
    defaultAccentThemeId
  );

  useEffect(() => {
    const param = builderMatch?.params.holes ?? flowMatch?.params.holes ?? "";
    const parsed = Number(param);
    if (Number.isNaN(parsed) || !isHoleOption(parsed)) {
      if (!param) {
        const stored = window.localStorage.getItem(STORED_HOLES_KEY);
        const storedParsed = Number(stored);
        if (!Number.isNaN(storedParsed) && isHoleOption(storedParsed)) {
          setSelectedHoles(storedParsed);
        }
      }
      return;
    }
    setSelectedHoles(parsed);
  }, [builderMatch?.params.holes, flowMatch?.params.holes]);

  useEffect(() => {
    window.localStorage.setItem(STORED_HOLES_KEY, String(selectedHoles));
  }, [selectedHoles]);

  useEffect(() => {
    const activeTheme =
      accentThemes.find((theme) => theme.id === accentThemeId) ??
      accentThemes[0];
    const root = document.documentElement;
    root.style.setProperty("--primary", activeTheme.tokens.primary);
    root.style.setProperty(
      "--primary-foreground",
      activeTheme.tokens.primaryForeground
    );
    root.style.setProperty("--ring", activeTheme.tokens.ring);
    root.style.setProperty("--accent", activeTheme.tokens.accent);
  }, [accentThemeId]);

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  const builderPath = useMemo(
    () => `/builder/${selectedHoles}`,
    [selectedHoles]
  );
  const flowPath = useMemo(() => `/flow/${selectedHoles}`, [selectedHoles]);
  const isFlowActive = Boolean(flowMatch);

  return (
    <div className="min-h-screen bg-[hsl(var(--accent))] text-slate-900">
      <div className="min-h-screen">
        <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 sm:hidden">
              <Link
                to={builderPath}
                className="flex items-center gap-2"
                aria-label="WheelWeaver home"
              >
                <img
                  src="/logo-28.png"
                  alt="WheelWeaver logo"
                  className="h-6 w-6"
                />
                <div className="text-sm font-semibold tracking-[0.18em]">WW</div>
              </Link>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="sr-only">Rim Holes</span>
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={selectedHoles}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next) || !isHoleOption(next)) {
                      return;
                    }
                    setSelectedHoles(next);
                    navigate(isFlowActive ? `/flow/${next}` : `/builder/${next}`);
                  }}
                >
                  {holeOptions.map((holes) => (
                    <option key={holes} value={holes}>
                      {holes}
                    </option>
                  ))}
                </select>
              </label>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] sm:w-[360px]">
                  <SheetTitle>Menu</SheetTitle>
                  <div className="mt-6 space-y-3">
                    <SheetClose asChild>
                      <NavLink to={builderPath} className={drawerLinkClass}>
                        Builder
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to={flowPath} className={drawerLinkClass}>
                        Flowchart
                      </NavLink>
                    </SheetClose>
                    <div className="h-px bg-border" />
                    <SheetClose asChild>
                      <NavLink to="/about" className={drawerLinkClass}>
                        About
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/readme" className={drawerLinkClass}>
                        Readme
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/settings" className={drawerLinkClass}>
                        Settings
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/privacy" className={drawerLinkClass}>
                        Privacy
                      </NavLink>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
              <NavLink
                to={builderPath}
                className={({ isActive }) =>
                  `flex h-11 items-center justify-center rounded-md border text-sm font-semibold transition ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`
                }
              >
                Builder
              </NavLink>
              <NavLink
                to={flowPath}
                className={({ isActive }) =>
                  `flex h-11 items-center justify-center rounded-md border text-sm font-semibold transition ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`
                }
              >
                Flowchart
              </NavLink>
            </div>
            <div className="hidden items-center gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={builderPath}
                  className="flex items-center gap-2"
                  aria-label="WheelWeaver home"
                >
                  <img
                    src="/logo-28.png"
                    alt="WheelWeaver logo"
                    className="h-7 w-7"
                  />
                  <div className="text-lg font-semibold tracking-[0.14em]">
                    WHEELWEAVER
                  </div>
                </Link>
              </div>
              <label className="flex items-center justify-self-center gap-2 text-sm font-medium text-slate-700">
                Rim Holes
                <select
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={selectedHoles}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next) || !isHoleOption(next)) {
                      return;
                    }
                    setSelectedHoles(next);
                    navigate(isFlowActive ? `/flow/${next}` : `/builder/${next}`);
                  }}
                >
                  {holeOptions.map((holes) => (
                    <option key={holes} value={holes}>
                      {holes}
                    </option>
                  ))}
                </select>
              </label>
              <nav className="flex flex-wrap items-center justify-self-end gap-2">
                <NavLink to={builderPath} className={navLinkClass}>
                  Builder
                </NavLink>
                <NavLink to={flowPath} className={navLinkClass}>
                  Flowchart
                </NavLink>
                <NavLink to="/about" className={navLinkClass}>
                  About
                </NavLink>
                <NavLink to="/readme" className={navLinkClass}>
                  Readme
                </NavLink>
                <NavLink to="/settings" className={navLinkClass}>
                  Settings
                </NavLink>
              </nav>
            </div>
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
              <Route
                path="/flow"
                element={
                  <Navigate
                    to={`/flow/${defaultPatternRequest.holes}`}
                    replace
                  />
                }
              />
              <Route path="/flow/:holes" element={<Flow />} />
              <Route path="/readme" element={<Readme />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route
                path="/settings"
                element={
                  <Settings
                    tableColumns={tableColumns}
                    onTableColumnsChange={setTableColumns}
                    accentThemeId={accentThemeId}
                    onAccentThemeChange={setAccentThemeId}
                  />
                }
              />
            </Routes>
          </div>
        </main>
      </div>
      <footer className="border-t border-slate-200 bg-white/90 py-6 text-sm text-slate-600">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6">
          <Link to="/privacy" className="underline underline-offset-4">
            Privacy & cookies
          </Link>
        </div>
      </footer>
      <ConsentBanner />
      <Toaster />
    </div>
  );
}
