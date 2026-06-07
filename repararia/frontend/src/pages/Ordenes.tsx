import { FormEvent, ReactNode, useEffect, useState } from "react";
import { CheckCircle2, Plus, RefreshCcw, Save, Wrench, TriangleAlert } from "lucide-react";
import { apiRequest, Orden, Repuesto } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";

const estados = ["pendiente", "en_taller", "en_reparacion", "listo", "entregado"];

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [estado, setEstado] = useState("en_taller");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newOrden, setNewOrden] = useState({
    id_cliente: "",
    id_vehiculo: "",
    id_mecanico: "",
    descripcion_problema: "",
    fecha_estimada: "",
    costo_mano_obra: "0",
  });

  const [repuestoForm, setRepuestoForm] = useState({
    id_repuesto: "",
    //cantidad: "1",
    amount: "1", //
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const ordenData = await apiRequest<any>("/ordenes/orden_list?limit=100", { auth: true });
      //setOrdenes(Array.isArray(ordenData) ? ordenData : []);
      
      if (ordenData && ordenData.status === "success" && Array.isArray(ordenData.data)) {
        setOrdenes(ordenData.data);
      } else {
        setOrdenes(Array.isArray(ordenData) ? ordenData : []);
      }


      const repuestoData = await apiRequest<any>("/repuesto/list_repuestos?limit=150", { auth: true });
      if (repuestoData && repuestoData.status === "success" && Array.isArray(repuestoData.data)) {
        setRepuestos(repuestoData.data);
      } else if (repuestoData && repuestoData.items) {
        setRepuestos(repuestoData.items);
      } else {
        setRepuestos(Array.isArray(repuestoData) ? repuestoData : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con la pasarela de servicios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOrden(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
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
      setNewOrden({
        id_cliente: "",
        id_vehiculo: "",
        id_mecanico: "",
        descripcion_problema: "",
        fecha_estimada: "",
        costo_mano_obra: "0",
      });
      setMessage("Solicitud de orden cursada exitosamente al bus nativo");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo en la comunicación sincrónica TCP");
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/ordenes/change_by/${selected}/estado`, {
        method: "PATCH",
        body: { estado: estado },
      });
      setMessage(`Estado de la orden #${selected} mutado a ${estado}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setLoading(false);
    }
  }

  async function agregarRepuesto(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/ordenes/add_by/${selected}/repuestos`, {
        method: "POST",
        body: {
          id_repuesto: Number(repuestoForm.id_repuesto),
          cantidad: Number(repuestoForm.amount), 
        },
      });
      setMessage("Asignación de material consolidada en el inventario");
      setRepuestoForm({ id_repuesto: "", amount: "1" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo al asignar repuesto");
    } finally {
      setLoading(false);
    }
  }

  async function cerrarOrden() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/ordenes/close_by/${selected}/cerrar`, { method: "POST" });
      setMessage(`Orden #${selected} cerrada operativamente. Facturación disparada.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al efectuar cierre de orden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Gestión Operativa de Órdenes</h2>
            <p className="text-sm text-muted-foreground">
              Bridge de traducción HTTP a Sockets TCP nativos para control de flujo del taller.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Sincronizar Bus
          </Button>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Órdenes de Trabajo en Sistema</CardTitle>
            <CardDescription>Seleccione un registro para desplegar los comandos transaccionales.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Descripción del Problema</TH>
                  <TH>Estado</TH>
                  <TH>Mecánico Asignado</TH>
                </TR>
              </THead>
              <TBody>
                {ordenes.map((orden) => (
                  <TR
                    key={orden.id_orden}
                    className={`cursor-pointer transition-colors ${selected === orden.id_orden ? "bg-muted font-medium" : "hover:bg-muted/40"}`}
                    onClick={() => setSelected(orden.id_orden)}
                  >
                    <TD>#{orden.id_orden}</TD>
                    <TD className="max-w-xs truncate">{orden.descripcion_problema ?? "Sin descripción"}</TD>
                    <TD><Badge status={orden.estado}>{orden.estado}</Badge></TD>
                    <TD>{orden.id_mecanico ? `ID Técnico: ${orden.id_mecanico}` : "No asignado"}</TD>
                  </TR>
                ))}
                {!ordenes.length && (
                  <TR>
                    <TD colSpan={4} className="h-24 text-center text-muted-foreground">
                      {loading ? "Transmitiendo tramas desde el bus..." : "No se registran órdenes activas."}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Apertura de Orden</CardTitle>
            <CardDescription>Ingreso de parámetros obligatorios al subsistema core.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createOrden}>
              <Field label="ID Cliente de Referencia">
                <Input
                  value={newOrden.id_cliente}
                  onChange={(e) => setNewOrden({ ...newOrden, id_cliente: e.target.value })}
                  type="number"
                  required
                />
              </Field>
              <Field label="ID Vehículo Identificado">
                <Input
                  value={newOrden.id_vehiculo}
                  onChange={(e) => setNewOrden({ ...newOrden, id_vehiculo: e.target.value })}
                  type="number"
                  required
                />
              </Field>
              <Field label="ID Mecánico Responsable">
                <Input
                  value={newOrden.id_mecanico}
                  onChange={(e) => setNewOrden({ ...newOrden, id_mecanico: e.target.value })}
                  type="number"
                />
              </Field>
              <Field label="Fecha Estimada de Retiro">
                <Input
                  value={newOrden.fecha_estimada}
                  onChange={(e) => setNewOrden({ ...newOrden, fecha_estimada: e.target.value })}
                  type="date"
                />
              </Field>
              <Field label="Valor Mano de Obra (CLP)">
                <Input
                  value={newOrden.costo_mano_obra}
                  onChange={(e) => setNewOrden({ ...newOrden, costo_mano_obra: e.target.value })}
                  type="number"
                  min="0"
                />
              </Field>
              <Field label="Anamnesis / Problema Reportado">
                <Textarea
                  value={newOrden.descripcion_problema}
                  onChange={(e) => setNewOrden({ ...newOrden, descripcion_problema: e.target.value })}
                  required
                />
              </Field>
              <Button className="w-full" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Aperturar Orden
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comandos de Estado</CardTitle>
            <CardDescription>
              Operando sobre orden activa: {selected ? `#${selected}` : "Ninguna seleccionada"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Transición de Estado Técnico">
              <select
                className="h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={!selected || loading}
              >
                {estados.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Button
              className="w-full"
              variant="outline"
              onClick={cambiarEstado}
              disabled={!selected || loading}
            >
              <Save className="h-4 w-4 mr-2" />
              Actualizar Estado
            </Button>

            <div className="border-t pt-4">
              <form className="space-y-3" onSubmit={agregarRepuesto}>
                <Field label="Asignar Repuesto del Stock">
                  <select
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={repuestoForm.id_repuesto}
                    onChange={(e) => setRepuestoForm({ ...repuestoForm, id_repuesto: e.target.value })}
                    required
                    disabled={!selected || loading}
                  >
                    <option value="">Seleccione repuesto</option>
                    {repuestos.map((rep) => (
                      <option key={rep.id_repuesto} value={rep.id_repuesto}>
                        {rep.codigo} - {rep.nombre} ({rep.stock_actual} un)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cantidad Solicitada">
                  <Input
                    value={repuestoForm.amount}
                    onChange={(e) => setRepuestoForm({ ...repuestoForm, amount: e.target.value })}
                    type="number"
                    min="1"
                    required
                    disabled={!selected || loading}
                  />
                </Field>
                <Button
                  className="w-full"
                  type="submit"
                  variant="outline"
                  disabled={!selected || loading}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Inyectar Repuesto
                </Button>
              </form>
            </div>

            <div className="border-t pt-4">
              <Button
                className="w-full"
                variant="secondary"
                onClick={cerrarOrden}
                disabled={!selected || loading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Cierre Definitivo & Facturar
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}