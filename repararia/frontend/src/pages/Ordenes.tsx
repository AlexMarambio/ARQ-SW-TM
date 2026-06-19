import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  CheckCircle2, Plus, RefreshCcw, Save, Wrench,
  TriangleAlert, ChevronRight, Loader2,
} from "lucide-react";
import { apiRequest, Orden, Repuesto } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";

const ESTADOS = ["pendiente", "en_taller", "en_reparacion", "listo", "entregado"];

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [estado, setEstado] = useState("en_taller");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newOrden, setNewOrden] = useState({
    id_cliente: "", id_vehiculo: "", id_mecanico: "",
    descripcion_problema: "", fecha_estimada: "", costo_mano_obra: "0",
  });

  const [repuestoForm, setRepuestoForm] = useState({ id_repuesto: "", amount: "1" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const ordenData = await apiRequest<any>("/ordenes/orden_list?limit=100", { auth: true });
      if (ordenData?.status === "success" && Array.isArray(ordenData.data)) {
        setOrdenes(ordenData.data);
      } else {
        setOrdenes(Array.isArray(ordenData) ? ordenData : []);
      }

      const repData = await apiRequest<any>("/repuesto/list_repuestos?limit=150", { auth: true });
      if (repData?.status === "success" && Array.isArray(repData.data)) {
        setRepuestos(repData.data);
      } else {
        setRepuestos(Array.isArray(repData) ? repData : repData?.items ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createOrden(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      await apiRequest<Orden>("/ordenes/create_orden", {
        method: "POST",
        body: {
          id_cliente: Number(newOrden.id_cliente),
          id_vehiculo: Number(newOrden.id_vehiculo),
          id_mecanico: newOrden.id_mecanico ? Number(newOrden.id_mecanico) : null,
          descripcion_problema: newOrden.descripcion_problema,
          fecha_estimada: newOrden.fecha_estimada || null,
          costo_mano_obra: Number(newOrden.costo_mano_obra || 0),
        },
      });
      setNewOrden({ id_cliente: "", id_vehiculo: "", id_mecanico: "", descripcion_problema: "", fecha_estimada: "", costo_mano_obra: "0" });
      setMessage("Orden creada correctamente.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la orden.");
    } finally { setLoading(false); }
  }

  async function cambiarEstado() {
    if (!selected) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await apiRequest(`/ordenes/change_by/${selected}/estado`, { method: "PATCH", body: { estado } });
      setMessage(`Estado actualizado a "${estado}" en la orden #${selected}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally { setLoading(false); }
  }

  async function agregarRepuesto(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await apiRequest(`/ordenes/add_by/${selected}/repuestos`, {
        method: "POST",
        body: { id_repuesto: Number(repuestoForm.id_repuesto), cantidad: Number(repuestoForm.amount) },
      });
      setMessage("Repuesto asignado correctamente.");
      setRepuestoForm({ id_repuesto: "", amount: "1" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el repuesto.");
    } finally { setLoading(false); }
  }

  async function cerrarOrden() {
    if (!selected) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await apiRequest(`/ordenes/close_by/${selected}/cerrar`, { method: "POST" });
      setMessage(`Orden #${selected} cerrada y enviada a facturación.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la orden.");
    } finally { setLoading(false); }
  }

  const selectedOrden = ordenes.find((o) => o.id_orden === selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Órdenes de trabajo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Crea, administra y cierra órdenes del taller.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Órdenes registradas</CardTitle>
            <CardDescription>
              {selected
                ? `Orden #${selected} seleccionada — "${selectedOrden?.descripcion_problema ?? ""}"`
                : "Selecciona una fila para gestionar la orden."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Problema</TH>
                  <TH>Estado</TH>
                  <TH>Mecánico</TH>
                  <TH className="w-8"></TH>
                </TR>
              </THead>
              <TBody>
                {ordenes.map((orden) => (
                  <TR
                    key={orden.id_orden}
                    className={`cursor-pointer ${selected === orden.id_orden ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                    onClick={() => setSelected(orden.id_orden)}
                  >
                    <TD>
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        #{orden.id_orden}
                      </span>
                    </TD>
                    <TD className="max-w-xs truncate text-slate-900 font-medium">
                      {orden.descripcion_problema ?? "Sin descripción"}
                    </TD>
                    <TD><Badge status={orden.estado}>{orden.estado}</Badge></TD>
                    <TD className="text-slate-500 text-xs">
                      {orden.id_mecanico ? `Téc. ${orden.id_mecanico}` : "Sin asignar"}
                    </TD>
                    <TD>
                      {selected === orden.id_orden && (
                        <ChevronRight className="h-4 w-4 text-blue-500" />
                      )}
                    </TD>
                  </TR>
                ))}
                {!ordenes.length && (
                  <TR>
                    <TD colSpan={5} className="h-32 text-center text-slate-400">
                      {loading ? "Cargando órdenes..." : "No hay órdenes registradas."}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* New order */}
          <Card>
            <CardHeader>
              <CardTitle>Nueva orden</CardTitle>
              <CardDescription>Registra una orden de trabajo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createOrden}>
                <Field label="ID cliente">
                  <Input value={newOrden.id_cliente} onChange={(e) => setNewOrden({ ...newOrden, id_cliente: e.target.value })} type="number" required />
                </Field>
                <Field label="ID vehículo">
                  <Input value={newOrden.id_vehiculo} onChange={(e) => setNewOrden({ ...newOrden, id_vehiculo: e.target.value })} type="number" required />
                </Field>
                <Field label="ID mecánico (opcional)">
                  <Input value={newOrden.id_mecanico} onChange={(e) => setNewOrden({ ...newOrden, id_mecanico: e.target.value })} type="number" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha estimada">
                    <Input value={newOrden.fecha_estimada} onChange={(e) => setNewOrden({ ...newOrden, fecha_estimada: e.target.value })} type="date" />
                  </Field>
                  <Field label="Mano de obra (CLP)">
                    <Input value={newOrden.costo_mano_obra} onChange={(e) => setNewOrden({ ...newOrden, costo_mano_obra: e.target.value })} type="number" min="0" />
                  </Field>
                </div>
                <Field label="Descripción del problema">
                  <Textarea value={newOrden.descripcion_problema} onChange={(e) => setNewOrden({ ...newOrden, descripcion_problema: e.target.value })} required />
                </Field>
                <Button className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear orden
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Actions on selected */}
          <Card className={!selected ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
              <CardDescription>
                {selected ? `Orden #${selected}` : "Selecciona una orden"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Change status */}
              <div className="space-y-3">
                <Field label="Cambiar estado">
                  <select
                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    disabled={!selected || loading}
                  >
                    {ESTADOS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Button variant="outline" className="w-full" onClick={cambiarEstado} disabled={!selected || loading}>
                  <Save className="h-4 w-4" />
                  Guardar estado
                </Button>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Agregar repuesto</p>
                <form className="space-y-3" onSubmit={agregarRepuesto}>
                  <Field label="Repuesto">
                    <select
                      className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={repuestoForm.id_repuesto}
                      onChange={(e) => setRepuestoForm({ ...repuestoForm, id_repuesto: e.target.value })}
                      required
                      disabled={!selected || loading}
                    >
                      <option value="">Seleccionar...</option>
                      {repuestos.map((rep) => (
                        <option key={rep.id_repuesto} value={rep.id_repuesto}>
                          {rep.codigo} — {rep.nombre} ({rep.stock_actual} un)
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cantidad">
                    <Input value={repuestoForm.amount} onChange={(e) => setRepuestoForm({ ...repuestoForm, amount: e.target.value })} type="number" min="1" required disabled={!selected || loading} />
                  </Field>
                  <Button variant="outline" className="w-full" type="submit" disabled={!selected || loading}>
                    <Wrench className="h-4 w-4" />
                    Asignar repuesto
                  </Button>
                </form>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <Button variant="success" className="w-full" onClick={cerrarOrden} disabled={!selected || loading}>
                  <CheckCircle2 className="h-4 w-4" />
                  Cerrar y facturar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}