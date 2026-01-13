import { NavLink, Route, Routes } from "react-router-dom";
import Builder from "./routes/Builder";
import Readme from "./routes/Readme";

const linkBase =
  "block rounded-md px-3 py-2 text-sm font-medium transition";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${linkBase} ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:bg-slate-100"
  }`;

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-56 border-r border-slate-200 bg-white p-6">
          <div className="text-lg font-semibold">Wheel Lacing</div>
          <nav className="mt-6 space-y-2">
            <NavLink to="/" className={navLinkClass} end>
              Builder
            </NavLink>
            <NavLink to="/readme" className={navLinkClass}>
              Readme
            </NavLink>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <div className="w-full max-w-none">
            <Routes>
              <Route path="/" element={<Builder />} />
              <Route path="/readme" element={<Readme />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
