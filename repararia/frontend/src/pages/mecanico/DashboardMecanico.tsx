import { useEffect, useState } from "react";
import { RefreshCcw, ClipboardList, CheckCircle, Clock, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

interface Orden {
  id_orden: number;
  estado: string;
  fecha_ingreso: string;
  costo_total: number;
  cliente?: string;
  patente?: string;
}

export default function DashboardMecanico({ session }: { session: any }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Orden[] }>("/ordenes/orden_list?limit=50", { auth: true });
      setOrdenes(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const completadas = ordenes.filter((o) => o.estado === "entregado").length;
  const activas = ordenes.filter((o) => o.estado !== "entregado").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Hola{session?.nombre ? `, ${session.nombre}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Tus órdenes asignadas.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total órdenes", value: ordenes.length, icon: <ClipboardList className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50" },
          { label: "Activas", value: activas, icon: <Clock className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50" },
          { label: "Completadas", value: completadas, icon: <CheckCircle className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">{s.label}</p>
                <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
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
              {ordenes.map((o) => (
                <TR key={o.id_orden}>
                  <TD>
                    <span className="font-mono text-xs font-semibold text-slate-500">#{o.id_orden}</span>
                  </TD>
                  <TD className="font-medium text-slate-900">{(o as any).cliente || "—"}</TD>
                  <TD>
                    <span className="font-mono text-xs bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                      {(o as any).patente || "—"}
                    </span>
                  </TD>
                  <TD><Badge status={o.estado}>{o.estado}</Badge></TD>
                  <TD className="text-xs text-slate-500">
                    {new Date(o.fecha_ingreso).toLocaleDateString("es-CL")}
                  </TD>
                  <TD className="text-right font-mono font-semibold text-slate-900">
                    ${o.costo_total.toLocaleString("es-CL")}
                  </TD>
                </TR>
              ))}
              {!ordenes.length && (
                <TR>
                  <TD colSpan={6} className="h-32 text-center text-slate-400">
                    {loading
                      ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando órdenes...</span>
                      : "No tienes órdenes asignadas."
                    }
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