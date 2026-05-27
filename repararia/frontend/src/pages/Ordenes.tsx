import { FormEvent, ReactNode, useEffect, useState } from "react";
import { CheckCircle2, Plus, RefreshCcw, Save, Wrench } from "lucide-react";

import { apiRequest, Orden, Repuesto } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/table";
import { Textarea } from "../components/ui/textarea";

type OrdenesResponse = {
  items: Orden[];
  total: number;
};

type RepuestosResponse = {
  items: Repuesto[];
  total: number;
};

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
    cantidad: "1",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordenData, repuestoData] = await Promise.all([
        apiRequest<OrdenesResponse>("/ordenes?limite=30"),
        apiRequest<RepuestosResponse>("/repuestos?limite=50"),
      ]);
      setOrdenes(ordenData.items ?? []);
      setRepuestos(repuestoData.items ?? []);
      setSelected((current) => current ?? ordenData.items?.[0]?.id_orden ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOrden(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      await apiRequest("/ordenes", {
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
      setMessage("Orden creada");
      await load();
    });
  }

  async function cambiarEstado() {
    if (!selected) return;
    await runAction(async () => {
      await apiRequest(`/ordenes/${selected}/estado`, {
        method: "PATCH",
        body: { nuevo_estado: estado },
      });
      setMessage("Estado actualizado");
      await load();
    });
  }

  async function agregarRepuesto(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await runAction(async () => {
      await apiRequest(`/ordenes/${selected}/repuestos`, {
        method: "POST",
        body: {
          id_repuesto: Number(repuestoForm.id_repuesto),
          cantidad: Number(repuestoForm.cantidad),
        },
      });
      setMessage("Repuesto agregado");
      setRepuestoForm({ id_repuesto: "", cantidad: "1" });
      await load();
    });
  }

  async function cerrarOrden() {
    if (!selected) return;
    await runAction(async () => {
      await apiRequest(`/ordenes/${selected}/cerrar`, { method: "POST" });
      setMessage("Orden cerrada y factura generada");
      await load();
    });
  }

  async function runAction(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "La accion fallo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Gestion de ordenes</h2>
            <p className="text-sm text-muted-foreground">
              Crear, cambiar estado, agregar repuestos y cerrar ordenes.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Ordenes</CardTitle>
            <CardDescription>Selecciona una orden para operar sobre ella.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Problema</TH>
                  <TH>Estado</TH>
                  <TH>Token publico</TH>
                </TR>
              </THead>
              <TBody>
                {ordenes.map((orden) => (
                  <TR
                    key={orden.id_orden}
                    className={selected === orden.id_orden ? "bg-muted" : undefined}
                    onClick={() => setSelected(orden.id_orden)}
                  >
                    <TD className="font-medium">#{orden.id_orden}</TD>
                    <TD className="max-w-sm truncate">
                      {orden.descripcion_problema ?? "Sin descripcion"}
                    </TD>
                    <TD>
                      <Badge status={orden.estado}>{orden.estado}</Badge>
                    </TD>
                    <TD className="max-w-48 truncate text-muted-foreground">
                      {orden.token_acceso_publico ?? "-"}
                    </TD>
                  </TR>
                ))}
                {!ordenes.length ? (
                  <TR>
                    <TD colSpan={4} className="h-24 text-center text-muted-foreground">
                      {loading ? "Cargando..." : "Sin ordenes"}
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva orden</CardTitle>
            <CardDescription>Datos minimos del ingreso al taller.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createOrden}>
              <Field label="ID cliente">
                <Input
                  value={newOrden.id_cliente}
                  onChange={(event) =>
                    setNewOrden({ ...newOrden, id_cliente: event.target.value })
                  }
                  type="number"
                  required
                />
              </Field>
              <Field label="ID vehiculo">
                <Input
                  value={newOrden.id_vehiculo}
                  onChange={(event) =>
                    setNewOrden({ ...newOrden, id_vehiculo: event.target.value })
                  }
                  type="number"
                  required
                />
              </Field>
              <Field label="ID mecanico">
                <Input
                  value={newOrden.id_mecanico}
                  onChange={(event) =>
                    setNewOrden({ ...newOrden, id_mecanico: event.target.value })
                  }
                  type="number"
                />
              </Field>
              <Field label="Fecha estimada">
                <Input
                  value={newOrden.fecha_estimada}
                  onChange={(event) =>
                    setNewOrden({ ...newOrden, fecha_estimada: event.target.value })
                  }
                  type="date"
                />
              </Field>
              <Field label="Mano de obra">
                <Input
                  value={newOrden.costo_mano_obra}
                  onChange={(event) =>
                    setNewOrden({ ...newOrden, costo_mano_obra: event.target.value })
                  }
                  type="number"
                  min="0"
                />
              </Field>
              <Field label="Problema">
                <Textarea
                  value={newOrden.descripcion_problema}
                  onChange={(event) =>
                    setNewOrden({
                      ...newOrden,
                      descripcion_problema: event.target.value,
                    })
                  }
                  required
                />
              </Field>
              <Button className="w-full" disabled={loading}>
                <Plus className="h-4 w-4" />
                Crear orden
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operacion</CardTitle>
            <CardDescription>
              Orden seleccionada: {selected ? `#${selected}` : "ninguna"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nuevo estado">
              <select
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
              >
                {estados.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              className="w-full"
              variant="outline"
              onClick={cambiarEstado}
              disabled={!selected || loading}
            >
              <Save className="h-4 w-4" />
              Cambiar estado
            </Button>

            <form className="space-y-3" onSubmit={agregarRepuesto}>
              <Field label="Repuesto">
                <select
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                  value={repuestoForm.id_repuesto}
                  onChange={(event) =>
                    setRepuestoForm({ ...repuestoForm, id_repuesto: event.target.value })
                  }
                  required
                >
                  <option value="">Seleccionar</option>
                  {repuestos.map((repuesto) => (
                    <option key={repuesto.id_repuesto} value={repuesto.id_repuesto}>
                      {repuesto.codigo} - {repuesto.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad">
                <Input
                  value={repuestoForm.cantidad}
                  onChange={(event) =>
                    setRepuestoForm({ ...repuestoForm, cantidad: event.target.value })
                  }
                  type="number"
                  min="1"
                  required
                />
              </Field>
              <Button
                className="w-full"
                type="submit"
                variant="outline"
                disabled={!selected || loading}
              >
                <Wrench className="h-4 w-4" />
                Agregar repuesto
              </Button>
            </form>

            <Button
              className="w-full"
              variant="secondary"
              onClick={cerrarOrden}
              disabled={!selected || loading}
            >
              <CheckCircle2 className="h-4 w-4" />
              Cerrar orden
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
