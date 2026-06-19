import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Plus, RefreshCcw, Save, Wrench,
  TriangleAlert, ChevronRight, Loader2, Car, UserRound,
} from "lucide-react";
import {
  ICliente,
  IOrden,
  IRepuesto,
  IVehiculo,
  EstadoOrden,
  clienteApi,
  ordenesApi,
  repuestoApi,
  vehiculoApi,
} from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";

const ESTADOS: EstadoOrden[] = ["pendiente", "en_proceso", "listo", "entregado"];
const SELECT_CLASS =
  "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<IOrden[]>([]);
  const [repuestos, setRepuestos] = useState<IRepuesto[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [estado, setEstado] = useState<EstadoOrden>("pendiente");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [vehiculos, setVehiculos] = useState<IVehiculo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [newOrden, setNewOrden] = useState({
    id_cliente: "", id_vehiculo: "", id_mecanico: "", descripcion: ""
  });

  const [repuestoForm, setRepuestoForm] = useState({ id_repuesto: "", amount: "1" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordenData, repData] = await Promise.all([
        ordenesApi.list({ limit: 100 }),
        repuestoApi.list({ limit: 150 }),
      ]);
      setOrdenes(ordenData);
      setRepuestos(repData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogos() {
    setCatalogLoading(true);
    try {
      const [clienteData, vehiculoData] = await Promise.all([
        clienteApi.list({ limit: 300 }),
        vehiculoApi.list({ limit: 300 }),
      ]);
      setClientes(clienteData);
      setVehiculos(vehiculoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar clientes y vehículos.");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadCatalogos();
  }, []);

  const vehiculosDelCliente = useMemo(() => {
    if (!newOrden.id_cliente) return [];
    const idCliente = Number(newOrden.id_cliente);
    return vehiculos.filter((vehiculo) => vehiculo.id_cliente === idCliente);
  }, [newOrden.id_cliente, vehiculos]);

  const selectedCliente = clientes.find(
    (cliente) => cliente.id_cliente === Number(newOrden.id_cliente),
  );
  const selectedVehiculo = vehiculos.find(
    (vehiculo) => vehiculo.id_vehiculo === Number(newOrden.id_vehiculo),
  );

  function updateNewOrden<K extends keyof typeof newOrden>(
    key: K,
    value: (typeof newOrden)[K],
  ) {
    setNewOrden((current) => {
      const next = { ...current, [key]: value };
      if (key === "id_cliente") next.id_vehiculo = "";
      return next;
    });
  }

  async function createOrden(e: FormEvent) {
    e.preventDefault();
    if (!newOrden.id_cliente || !newOrden.id_vehiculo) {
      setError("Selecciona cliente y vehículo para crear la orden.");
      return;
    }

    setLoading(true); setError(null); setMessage(null);
    try {
      await ordenesApi.create({
        id_cliente: Number(newOrden.id_cliente),
        id_vehiculo: Number(newOrden.id_vehiculo),
        id_mecanico: newOrden.id_mecanico ? Number(newOrden.id_mecanico) : null,
        descripcion_problema: newOrden.descripcion.trim() || undefined,
      });
      setNewOrden({ id_cliente: "", id_vehiculo: "", id_mecanico: "", descripcion: "" });
      setMessage("Orden creada correctamente.");
      await Promise.all([load(), loadCatalogos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la orden.");
    } finally { setLoading(false); }
  }

  async function cambiarEstado() {
    if (!selected) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await ordenesApi.cambiarEstado(selected, estado);
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
      await ordenesApi.addRepuesto(selected, Number(repuestoForm.id_repuesto), Number(repuestoForm.amount));
      setMessage("Repuesto asignado correctamente.");
      setRepuestoForm({ id_repuesto: "", amount: "1" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar el repuesto.");
    } finally { setLoading(false); }
  }

  async function cerrarOrden() {
    if (!selected) return;

    const ordenActual = ordenes.find((o) => o.id_orden === selected);
    if (ordenActual?.estado === "entregado") {
      setError("Esta orden ya se encuentra cerrada y facturada.");
      return;
    }

    setLoading(true); setError(null); setMessage(null);
    try {
      await ordenesApi.cerrar(selected);
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
                ? `Orden #${selected} seleccionada — "${selectedOrden?.descripcion_problema ?? selectedOrden?.descripcion ?? ""}"`
                : "Selecciona una fila para gestionar la orden."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Cliente</TH>
                  <TH>Vehículo</TH>
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
                    <TD>
                      <p className="text-sm font-medium text-slate-900">
                        {orden.cliente ?? `Cliente #${orden.id_cliente}`}
                      </p>
                    </TD>
                    <TD>
                      <p className="font-mono text-xs font-semibold text-amber-900">
                        {orden.patente ?? orden.vehiculo?.patente ?? "S/P"}
                      </p>
                      {(orden.vehiculo?.marca || orden.vehiculo?.modelo) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[orden.vehiculo?.marca, orden.vehiculo?.modelo].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </TD>
                    <TD className="max-w-xs truncate text-slate-900 font-medium">
                      {orden.descripcion_problema ?? orden.descripcion ?? "Sin descripción"}
                    </TD>
                    <TD><Badge status={orden.estado}>{orden.estado}</Badge></TD>
                    <TD className="text-slate-500 text-xs">
                      {orden.mecanico ?? (orden.id_mecanico ? `Téc. ${orden.id_mecanico}` : "Sin asignar")}
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
                    <TD colSpan={7} className="h-32 text-center text-slate-400">
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
              <CardDescription>
                Elige propietario y vehículo; la orden quedará en estado pendiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={createOrden}>
                <Field label="Cliente">
                  <select
                    className={SELECT_CLASS}
                    value={newOrden.id_cliente}
                    onChange={(e) => updateNewOrden("id_cliente", e.target.value)}
                    required
                    disabled={loading || catalogLoading}
                  >
                    <option value="">
                      {catalogLoading ? "Cargando clientes..." : "Seleccionar cliente..."}
                    </option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id_cliente} value={cliente.id_cliente}>
                        {cliente.nombre} ({cliente.rut})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Vehículo">
                  <select
                    className={SELECT_CLASS}
                    value={newOrden.id_vehiculo}
                    onChange={(e) => updateNewOrden("id_vehiculo", e.target.value)}
                    required
                    disabled={!newOrden.id_cliente || loading || catalogLoading}
                  >
                    <option value="">
                      {!newOrden.id_cliente
                        ? "Primero selecciona un cliente"
                        : vehiculosDelCliente.length
                          ? "Seleccionar vehículo..."
                          : "Este cliente no tiene vehículos"}
                    </option>
                    {vehiculosDelCliente.map((vehiculo) => (
                      <option key={vehiculo.id_vehiculo} value={vehiculo.id_vehiculo}>
                        {vehiculo.patente} - {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Mecánico">
                  <Input
                    value={newOrden.id_mecanico}
                    onChange={(e) => updateNewOrden("id_mecanico", e.target.value)}
                    type="number"
                    min="1"
                    placeholder="Predeterminado #1"
                    disabled={loading || catalogLoading}
                  />
                </Field>
                <Field label="Descripción del problema">
                  <Textarea
                    value={newOrden.descripcion}
                    onChange={(e) => updateNewOrden("descripcion", e.target.value)}
                    placeholder="Ej: ruido al frenar, revisar pastillas y discos delanteros."
                    disabled={loading}
                  />
                </Field>
                {(selectedCliente || selectedVehiculo || newOrden.id_mecanico) && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Resumen</p>
                    {selectedCliente && (
                      <p className="mt-1 flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 text-slate-400" />
                        {selectedCliente.nombre}
                      </p>
                    )}
                    {selectedVehiculo && (
                      <p className="mt-1 flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-slate-400" />
                        {selectedVehiculo.patente} - {selectedVehiculo.marca} {selectedVehiculo.modelo}
                      </p>
                    )}
                    <p className="mt-1 text-slate-500">
                      Técnico: {newOrden.id_mecanico ? `#${newOrden.id_mecanico}` : "predeterminado"}
                    </p>
                  </div>
                )}
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
                    className={SELECT_CLASS}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoOrden)}
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
                      className={SELECT_CLASS}
                      value={repuestoForm.id_repuesto}
                      onChange={(e) => setRepuestoForm({ ...repuestoForm, id_repuesto: e.target.value })}
                      required
                      disabled={!selected || loading}
                    >
                      <option value="">Seleccionar...</option>
                      {repuestos.map((rep) => (
                        <option key={rep.id_repuesto} value={rep.id_repuesto}>
                          {rep.sku} — {rep.nombre} ({rep.stock_actual} un)
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
                <Button 
                  variant="success" 
                  className="w-full" 
                  onClick={cerrarOrden} 
                  // SE DESHABILITA SI CARGA, SI NO HAY SELECCIÓN, O SI YA ESTÁ CERRADA
                  disabled={!selected || loading || selectedOrden?.estado === "entregado"}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedOrden?.estado === "entregado" ? "Orden ya cerrada" : "Cerrar y facturar"}
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
