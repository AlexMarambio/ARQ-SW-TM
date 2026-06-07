import { RefreshCcw, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiRequest, Orden } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";

interface ApiResponseSOA {
  status: string;
  data: Orden[];
}

type OrdenesResponse = {
  items: Orden[];
  total: number;
};

export default function DashboardPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  //const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      
      //const data = await apiRequest<OrdenesResponse>("/ordenes?limite=20");
      const response = await apiRequest<ApiResponseSOA>("/ordenes/orden_list?limit=20", { auth: true });
      
      if (response && response.status === "success" && Array.isArray(response.data)) {
        setOrdenes(response.data);
        //setTotal(response.data.length);
      } else if (Array.isArray(response)) {
        setOrdenes(response);
        //setTotal(response.length);
      } else {
        setOrdenes([]);
        //setTotal(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar ordenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const total = ordenes.length;
    const active = ordenes.filter((orden) => orden.estado !== "entregado").length;
    const ready = ordenes.filter((orden) => orden.estado === "listo").length;
    const repair = ordenes.filter((orden) => orden.estado === "en_reparacion").length;
    return { total, active, ready, repair };
  }, [ordenes]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard admin</h2>
          <p className="text-sm text-muted-foreground">
            Vista operativa de ordenes activas y carga del taller.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Total" value={stats.total} />
        <Stat title="Activas" value={stats.active} />
        <Stat title="En Reparación" value={stats.repair} />
        <Stat title="Listos para Entrega" value={stats.ready} />
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* <Card>
        <CardHeader>
          <CardTitle>Ordenes activas</CardTitle>
          <CardDescription>Estado, vehiculo y mecanico asignado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Vehiculo</TH>
                <TH>Estado</TH>
                <TH>Mecanico</TH>
                <TH>Ingreso</TH>
                <TH className="text-right">Costo</TH>
              </TR>
            </THead>
            <TBody>
              {ordenes.map((orden) => (
                <TR key={orden.id_orden}>
                  <TD className="font-medium">#{orden.id_orden}</TD>
                  <TD>
                    {orden.vehiculo?.marca ?? "Vehiculo"} {orden.vehiculo?.modelo ?? ""}
                  </TD>
                  <TD>
                    <Badge status={orden.estado}>{orden.estado}</Badge>
                  </TD>
                  <TD>{orden.mecanico ?? orden.id_mecanico ?? "Sin asignar"}</TD>
                  <TD>{formatDate(orden.fecha_ingreso)}</TD>
                  <TD className="text-right">{formatMoney(orden.costo_total)}</TD>
                </TR>
              ))}
              {!ordenes.length ? (
                <TR>
                  <TD colSpan={6} className="h-24 text-center text-muted-foreground">
                    {loading ? "Cargando..." : "Sin ordenes para mostrar"}
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>Monitoreo de Órdenes de Trabajo</CardTitle>
          <CardDescription>Flujo de datos transaccionales en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Identificación Cliente</TH>
                <TH>Patente Unidad</TH>
                <TH>Estado</TH>
                <TH>Ingreso</TH>
                <TH className="text-right">Monto Líquido</TH>
              </TR>
            </THead>
            <TBody>
              {ordenes.map((orden) => (
                <TR key={orden.id_orden} className="hover:bg-muted/40 transition-colors">
                  <TD className="font-mono font-bold">#{orden.id_orden}</TD>
                  {/* Mapea los campos directos devueltos por tu JOIN en handle_list_ordenes */}
                  <TD className="font-medium">{(orden as any).cliente ?? "Consumidor Final"}</TD>
                  <TD className="font-mono text-xs">
                    <span className="bg-slate-100 border px-1.5 py-0.5 rounded text-slate-800">
                      {(orden as any).patente ?? "S/P"}
                    </span>
                  </TD>
                  <TD>
                    <Badge status={orden.estado}>{orden.estado}</Badge>
                  </TD>
                  <TD>{formatDate(orden.fecha_ingreso)}</TD>
                  <TD className="text-right font-mono font-semibold">{formatMoney(orden.costo_total)}</TD>
                </TR>
              ))}
              {!ordenes.length && (
                <TR>
                  <TD colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                    {loading ? "Leyendo tramas binarias de la SOA..." : "No se registran órdenes para desplegar."}
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

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}

function formatMoney(value?: number) {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
