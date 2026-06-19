import { useEffect, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

interface Evento {
  id_auditoria: number;
  id_usuario: number;
  accion: string;
  entidad: string;
  detalle: string;
  fecha_hora: string;
}

const accionStatus: Record<string, string> = {
  CREATE: "listo",
  DELETE: "anulado",
  UPDATE: "en_taller",
  READ: "pendiente",
};

export default function AuditoriaPage({ session }: { session: any }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [entidad, setEntidad] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Evento[] }>("/auditoria/historial?limit=100", { auth: true });
      setEventos(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = eventos.filter((e) => {
    const matchSearch =
      e.accion.toLowerCase().includes(search.toLowerCase()) ||
      e.detalle.toLowerCase().includes(search.toLowerCase());
    const matchEntidad = entidad ? e.entidad === entidad : true;
    return matchSearch && matchEntidad;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Auditoría</h1>
          <p className="text-sm text-slate-500 mt-0.5">Historial de acciones realizadas en el sistema.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de eventos</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar acción o detalle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Todas las entidades</option>
              <option value="cliente">Cliente</option>
              <option value="vehiculo">Vehículo</option>
              <option value="orden_trabajo">Orden</option>
              <option value="repuesto">Repuesto</option>
              <option value="factura">Factura</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Usuario</TH>
                <TH>Acción</TH>
                <TH>Entidad</TH>
                <TH>Detalle</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((e) => (
                <TR key={e.id_auditoria}>
                  <TD className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(e.fecha_hora).toLocaleString("es-CL")}
                  </TD>
                  <TD>
                    <span className="font-mono text-xs text-slate-500">#{e.id_usuario}</span>
                  </TD>
                  <TD>
                    <Badge status={accionStatus[e.accion] ?? "pendiente"}>{e.accion}</Badge>
                  </TD>
                  <TD className="text-xs text-slate-600">{e.entidad}</TD>
                  <TD className="max-w-xs truncate text-xs text-slate-500">{e.detalle}</TD>
                </TR>
              ))}
              {!filtered.length && (
                <TR>
                  <TD colSpan={5} className="h-32 text-center text-slate-400">
                    {loading ? "Cargando eventos..." : "Sin eventos registrados."}
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