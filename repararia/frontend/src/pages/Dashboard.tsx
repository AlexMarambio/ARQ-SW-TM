import { RefreshCcw, TriangleAlert, ClipboardList, Wrench, CheckCircle2, Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest, Orden } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";

interface ApiResponseSOA {
  status: string;
  data: Orden[];
}

export default function DashboardPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<ApiResponseSOA>("/ordenes/orden_list?limit=20", { auth: true });
      if (response?.status === "success" && Array.isArray(response.data)) {
        setOrdenes(response.data);
      } else if (Array.isArray(response)) {
        setOrdenes(response as any);
      } else {
        setOrdenes([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const total = ordenes.length;
    const active = ordenes.filter((o) => o.estado !== "entregado").length;
    const ready = ordenes.filter((o) => o.estado === "listo").length;
    const repair = ordenes.filter((o) => o.estado === "en_reparacion").length;
    return { total, active, ready, repair };
  }, [ordenes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vista general</h1>
          <p className="text-sm text-slate-500 mt-0.5">Estado operativo del taller en tiempo real.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total órdenes"
          value={stats.total}
          icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Activas"
          value={stats.active}
          icon={<Activity className="h-5 w-5 text-amber-600" />}
          color="amber"
        />
        <StatCard
          title="En reparación"
          value={stats.repair}
          icon={<Wrench className="h-5 w-5 text-orange-600" />}
          color="orange"
        />
        <StatCard
          title="Listos para entrega"
          value={stats.ready}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          color="emerald"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de trabajo</CardTitle>
          <CardDescription>Monitoreo de todas las órdenes activas del taller.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Cliente</TH>
                <TH>Patente</TH>
                <TH>Estado</TH>
                <TH>Ingreso</TH>
                <TH className="text-right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {ordenes.map((orden) => (
                <TR key={orden.id_orden}>
                  <TD>
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      #{orden.id_orden}
                    </span>
                  </TD>
                  <TD className="font-medium text-slate-900">
                    {(orden as any).cliente ?? "—"}
                  </TD>
                  <TD>
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                      {(orden as any).patente ?? "S/P"}
                    </span>
                  </TD>
                  <TD>
                    <Badge status={orden.estado}>{orden.estado}</Badge>
                  </TD>
                  <TD className="text-slate-500 text-xs">{formatDate(orden.fecha_ingreso)}</TD>
                  <TD className="text-right font-mono text-sm font-semibold text-slate-900">
                    {formatMoney(orden.costo_total)}
                  </TD>
                </TR>
              ))}
              {!ordenes.length && (
                <TR>
                  <TD colSpan={6} className="h-32 text-center text-slate-400">
                    {loading ? "Cargando órdenes..." : "No hay órdenes registradas."}
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50",
    amber: "bg-amber-50",
    orange: "bg-orange-50",
    emerald: "bg-emerald-50",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">{title}</p>
          <div className={`p-2 rounded-lg ${bgMap[color] ?? "bg-slate-50"}`}>{icon}</div>
        </div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}

function formatMoney(value?: number) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}