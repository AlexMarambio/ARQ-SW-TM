import { RefreshCcw, TriangleAlert, ClipboardList, Wrench, CheckCircle2, TrendingUp, DollarSign, Users, BarChart3, } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

//import { apiRequest, Orden } from "../api/client";
import { IKpiAdmin, IOrden, dashboardApi, ordenesApi, } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";

// interface ApiResponseSOA {
//   status: string;
//   data: Orden[];
// }

export default function DashboardPage() {
  const [ordenes, setOrdenes] = useState<IOrden[]>([]);
  const [kpi, setKpi]         = useState<IKpiAdmin | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [loadingKpi, setLoadingKpi]         = useState(false);

  // Carga de KPIs
  async function loadKpi() {
    setLoadingKpi(true);
    try {
      const data = await dashboardApi.kpiAdmin();
      setKpi(data);
    } catch {
      // KPI no crítico; la tabla de ordenes sigue funcionando
    } finally {
      setLoadingKpi(false);
    }
  }

  // Carga de ordenes recientes
  async function loadOrdenes() {
    setLoadingOrdenes(true);
    setError(null);
    try {
      const data = await ordenesApi.list({ limit: 20 });
      setOrdenes(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las órdenes.",
      );
    } finally {
      setLoadingOrdenes(false);
    }
  }

  function loadAll() {
    void loadKpi();
    void loadOrdenes();
  }

  useEffect(() => { loadAll(); }, []);

  const isLoading = loadingKpi || loadingOrdenes;

  const localStats = useMemo(() => ({
    total:    ordenes.length,
    activas:  ordenes.filter((o) => o.estado !== "entregado").length,
    listas:   ordenes.filter((o) => o.estado === "listo").length,
    proceso:  ordenes.filter((o) => o.estado === "en_proceso").length,
  }), [ordenes]);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vista general</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Estado operativo del taller en tiempo real.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={isLoading}
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* ── KPI Cards — Operativos ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Órdenes activas"
          value={kpi?.ordenes_activas ?? localStats.activas}
          icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
          color="blue"
          loading={loadingKpi}
        />
        <StatCard
          title="En proceso"
          value={localStats.proceso}
          icon={<Wrench className="h-5 w-5 text-orange-600" />}
          color="orange"
          loading={loadingOrdenes}
        />
        <StatCard
          title="Listos para entrega"
          value={localStats.listas}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          color="emerald"
          loading={loadingOrdenes}
        />
        <StatCard
          title="Mecánicos activos"
          value={kpi?.total_mecanicos ?? 0}
          icon={<Users className="h-5 w-5 text-purple-600" />}
          color="purple"
          loading={loadingKpi}
        />
      </div>

      {/* ── KPI Cards — Financieros ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <FinancialCard
          title="Ingresos del mes"
          value={kpi?.ingresos_mes}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          bg="bg-emerald-50"
          loading={loadingKpi}
        />
        <FinancialCard
          title="Ingresos totales"
          value={kpi?.ingresos_totales}
          icon={<DollarSign className="h-5 w-5 text-blue-600" />}
          bg="bg-blue-50"
          loading={loadingKpi}
        />
        <FinancialCard
          title="Costo promedio / orden"
          value={kpi?.costo_promedio_orden}
          icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
          bg="bg-purple-50"
          loading={loadingKpi}
        />
      </div>

      {/* ── Órdenes por estado + Top clientes (side by side) ── */}
      {kpi && (
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Órdenes por estado */}
          <Card>
            <CardHeader>
              <CardTitle>Órdenes por estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(kpi.ordenes_por_estado).map(([estado, count]) => {
                const total = Object.values(kpi.ordenes_por_estado).reduce(
                  (a, b) => a + (b ?? 0), 0,
                );
                const pct = total > 0 ? Math.round(((count ?? 0) / total) * 100) : 0;
                return (
                  <div key={estado}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge status={estado}>{estado}</Badge>
                      <span className="text-sm font-semibold text-slate-700 tabular-nums">
                        {count} <span className="text-xs text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top clientes */}
          {kpi.top_clientes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clientes con más órdenes</CardTitle>
                <CardDescription>Ranking por total de órdenes.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100">
                {kpi.top_clientes.map((tc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 first:pt-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 w-5 text-right">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {tc.nombre}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 tabular-nums">
                      {tc.ordenes} órdenes
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Tabla de órdenes ── */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes recientes</CardTitle>
          <CardDescription>
            Últimas {ordenes.length} órdenes registradas en el sistema.
          </CardDescription>
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
                    {orden.cliente ?? "—"}
                  </TD>
                  <TD>
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                      {orden.patente ?? orden.vehiculo?.patente ?? "S/P"}
                    </span>
                  </TD>
                  <TD>
                    <Badge status={orden.estado}>{orden.estado}</Badge>
                  </TD>
                  <TD className="text-slate-500 text-xs">
                    {formatDate(orden.fecha_ingreso)}
                  </TD>
                  <TD className="text-right font-mono text-sm font-semibold text-slate-900">
                    {formatMoney(orden.costo_total)}
                  </TD>
                </TR>
              ))}
              {!ordenes.length && (
                <TR>
                  <TD colSpan={6} className="h-32 text-center text-slate-400">
                    {loadingOrdenes ? "Cargando órdenes…" : "No hay órdenes registradas."}
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

const COLOR_MAP: Record<string, string> = {
  blue:    "bg-blue-50",
  amber:   "bg-amber-50",
  orange:  "bg-orange-50",
  emerald: "bg-emerald-50",
  purple:  "bg-purple-50",
};


function StatCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-500">{title}</p>
          <div className={`p-2 rounded-lg ${COLOR_MAP[color] ?? "bg-slate-50"}`}>
            {icon}
          </div>
        </div>
        {loading ? (
          <div className="h-9 w-14 bg-slate-100 animate-pulse rounded-md" />
        ) : (
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}


function FinancialCard({
  title,
  value,
  icon,
  bg,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ReactNode;
  bg: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
          <p className="text-sm text-slate-500 leading-tight">{title}</p>
        </div>
        {loading ? (
          <div className="h-8 w-36 bg-slate-100 animate-pulse rounded-md" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatMoney(value ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Utilidades de formato

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}

function formatMoney(value?: number): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}