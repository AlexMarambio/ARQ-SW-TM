import * as React from "react";

import { cn } from "../../lib/utils";

const toneByStatus: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-700",
  en_taller: "bg-cyan-100 text-cyan-800",
  en_reparacion: "bg-amber-100 text-amber-800",
  listo: "bg-emerald-100 text-emerald-800",
  entregado: "bg-zinc-200 text-zinc-800",
};

export function Badge({
  className,
  status,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { status?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
        status ? toneByStatus[status] ?? "bg-muted text-muted-foreground" : "bg-muted",
        className,
      )}
      {...props}
    />
  );
}
