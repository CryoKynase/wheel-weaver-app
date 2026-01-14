import type { ReactNode } from "react";

const variants = {
  success: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-700",
};

export type BadgeProps = {
  variant?: keyof typeof variants;
  children: ReactNode;
  className?: string;
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        variants[variant]
      } ${className}`}
    >
      {children}
    </span>
  );
}
