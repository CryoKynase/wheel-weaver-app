import type { ReactNode } from "react";

const base = "rounded-lg border border-slate-200 bg-white";

export function Card({ children }: { children: ReactNode }) {
  return <div className={base}>{children}</div>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-900">{children}</h3>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-slate-600">{children}</p>;
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="px-4 py-4">{children}</div>;
}
