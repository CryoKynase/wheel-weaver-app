import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const variants = {
  error: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-700",
    Icon: AlertTriangle,
    label: "Error",
  },
  empty: {
    wrapper: "border-slate-200 bg-white text-slate-600",
    Icon: Info,
    label: "Empty",
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
    label: "Success",
  },
};

export type InlineAlertProps = {
  variant?: keyof typeof variants;
  title?: string;
  children?: ReactNode;
  className?: string;
};

export default function InlineAlert({
  variant = "empty",
  title,
  children,
  className = "",
}: InlineAlertProps) {
  const { wrapper, Icon, label } = variants[variant];

  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${wrapper} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4" />
      <div>
        <div className="font-semibold">{title ?? label}</div>
        {children && <div className="mt-0.5 text-sm">{children}</div>}
      </div>
    </div>
  );
}
