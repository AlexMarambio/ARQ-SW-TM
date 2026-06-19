import * as React from "react";
import { cn } from "../../lib/utils";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pendiente:     { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400" },
  en_taller:     { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500" },
  en_reparacion: { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500" },
  listo:         { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500" },
  entregado:     { bg: "bg-zinc-100",   text: "text-zinc-500",   dot: "bg-zinc-400" },
  pagado:        { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500" },
  anulado:       { bg: "bg-red-50",     text: "text-red-600",    dot: "bg-red-500" },
};

export function Badge({
  className,
  status,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { status?: string }) {
  const config = status ? statusConfig[status] : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config ? `${config.bg} ${config.text}` : "bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    >
      {config && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      )}
      {children}
    </span>
  );
}