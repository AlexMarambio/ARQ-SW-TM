import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCcw, Car, TriangleAlert, CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";

interface Vehiculo {
  id_vehiculo: number;
  id_cliente: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  num_motor?: string;
  kilometraje: number;
  color?: string;
}

interface Cliente {
  id_cliente: number;
  nombre: string;
  rut: string;
}

interface Props {
  session: { rol: "administrador" | "mecanico" | "sysadmin"; userId: number } | null;
}

export default function VehiculosPage({ session }: Props) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    id_cliente: "", patente: "", marca: "", modelo: "",
    anio: new Date().getFullYear().toString(),
    num_motor: "", kilometraje: "0", color: "",
  });

  async function loadData() {
    if (!isAuthorized) return;
    setLoading(true); setError(null);
    try {
      const [vData, cData] = await Promise.all([
        apiRequest<Vehiculo[]>("/vehiculo/list_vehiculos", { auth: true }),
        apiRequest<Cliente[]>("/cliente/list_clientes", { auth: true }),
      ]);
      setVehiculos(Array.isArray(vData) ? vData : []);
      setClientes(Array.isArray(cData) ? cData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (isAuthorized) void loadData(); }, [isAuthorized]);

  async function handleEnroll(e: FormEvent) {
    e.preventDefault();
    if (!isAuthorized) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await apiRequest("/vehiculo/create_vehiculo", {
        method: "POST",
        body: {
          id_cliente: Number(form.id_cliente),
          patente: form.patente.toUpperCase().trim(),
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          anio: Number(form.anio),
          num_motor: form.num_motor.trim() || null,
          kilometraje: Number(form.kilometraje),
          color: form.color.trim() || null,
        },
      });
      setMessage(`Vehículo ${form.patente.toUpperCase()} registrado correctamente.`);
      setForm({ id_cliente: "", patente: "", marca: "", modelo: "", anio: new Date().getFullYear().toString(), num_motor: "", kilometraje: "0", color: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el vehículo.");
    } finally { setLoading(false); }
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Acceso denegado</p>
          <p className="text-xs mt-0.5 text-red-600">No tienes permisos para gestionar vehículos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vehículos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro y trazabilidad del parque vehicular.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

        <Card>
          <CardHeader>
            <CardTitle>Vehículos registrados</CardTitle>
            <CardDescription>{vehiculos.length} unidades en el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Patente</TH>
                  <TH>Vehículo</TH>
                  <TH>Kilometraje</TH>
                  <TH>Propietario</TH>
                </TR>
              </THead>
              <TBody>
                {vehiculos.map((veh) => {
                  const owner = clientes.find((c) => c.id_cliente === veh.id_cliente);
                  return (
                    <TR key={veh.id_vehiculo}>
                      <TD>
                        <span className="font-mono text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded-md">
                          {veh.patente}
                        </span>
                      </TD>
                      <TD>
                        <p className="font-medium text-slate-900">{veh.marca} {veh.modelo}</p>
                        <p className="text-xs text-slate-400">{veh.anio} · {veh.color || "—"}</p>
                      </TD>
                      <TD>
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {veh.kilometraje.toLocaleString("es-CL")} km
                        </span>
                      </TD>
                      <TD>
                        {owner ? (
                          <div>
                            <p className="text-sm font-medium text-slate-900">{owner.nombre}</p>
                            <p className="text-xs text-slate-400 font-mono">{owner.rut}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500">ID: {veh.id_cliente}</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
                {!vehiculos.length && (
                  <TR>
                    <TD colSpan={4} className="h-32 text-center text-slate-400">
                      {loading ? "Cargando vehículos..." : "Sin vehículos registrados."}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrar vehículo</CardTitle>
            <CardDescription>Vincula el vehículo a un cliente existente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEnroll} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="id_cliente">Propietario</Label>
                <select
                  id="id_cliente"
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={form.id_cliente}
                  onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
                  required
                >
                  <option value="">Seleccionar propietario...</option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} ({c.rut})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patente">Patente</Label>
                <Input id="patente" value={form.patente} onChange={(e) => setForm({ ...form, patente: e.target.value })} placeholder="BBCC11" maxLength={8} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Marca</Label>
                  <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="BMW" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="M3" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Año</Label>
                  <Input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} min={1970} max={new Date().getFullYear() + 1} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Gris mineral" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Kilometraje</Label>
                <Input type="number" value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: e.target.value })} min={0} required />
              </div>

              <div className="space-y-1.5">
                <Label>N° motor (opcional)</Label>
                <Input value={form.num_motor} onChange={(e) => setForm({ ...form, num_motor: e.target.value })} placeholder="N55B30A..." />
              </div>

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
                Registrar vehículo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}