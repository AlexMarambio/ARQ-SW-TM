import { FormEvent, useEffect, useState, useMemo } from "react";
import { Plus, RefreshCcw, Car, TriangleAlert, CheckCircle2 } from "lucide-react";
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

interface VehiculosPageProps {
  session: {
    rol: "administrador" | "mecanico" | "sysadmin";
    userId: number;
  } | null;
}

export default function VehiculosPage({ session }: VehiculosPageProps) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    id_cliente: "",
    patente: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear().toString(),
    num_motor: "",
    kilometraje: "0",
    color: "",
  });

  async function loadData() {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      // Invocacion controlada mediante Bridge a servicios del Bus
      const [vehiculosData, clientesData] = await Promise.all([
        apiRequest<Vehiculo[]>("/vehiculo/list_vehiculos", { auth: true }),
        apiRequest<Cliente[]>("/cliente/list_clientes", { auth: true }),
      ]);
      setVehiculos(Array.isArray(vehiculosData) ? vehiculosData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error agregando dependencias desde la capa SOA");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      void loadData();
    }
  }, [isAuthorized]);

  //busqueda en memoria waparda
  const filteredVehiculos = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return vehiculos.filter((v) =>
      v.patente.toLowerCase().includes(query) ||
      v.marca.toLowerCase().includes(query) ||
      v.modelo.toLowerCase().includes(query) ||
      v.anio.toString().includes(query) ||
      v.color?.toLowerCase().includes(query) 
      //clientes.find((c) => c.id_cliente === v.id_cliente)?.nombre.toLowerCase().includes(query) ||
      //clientes.find((c) => c.id_cliente === v.id_cliente)?.rut.toLowerCase().includes(query);
    );
  }, [vehiculos, searchQuery]);

  async function handleEnroll(e: FormEvent) {
    e.preventDefault();
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    setMessage(null);

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
      setMessage(`Vehículo con patente [${form.patente.toUpperCase()}] incorporado al registro de trazabilidad`);
      setForm({
        id_cliente: "",
        patente: "",
        marca: "",
        modelo: "",
        anio: new Date().getFullYear().toString(),
        num_motor: "",
        kilometraje: "0",
        color: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo al procesar enrolamiento de chasis");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Acceso Denegado (403 Privilege Violation)</h3>
          <p className="text-xs mt-1">Su rol actual no posee los privilegios requeridos para invocar los endpoints transaccionales del subsistema de Vehículos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enrolamiento y Parque de Vehículos</h2>
          <p className="text-sm text-muted-foreground">Catálogo de trazabilidad de unidades especializadas vinculadas al padrón activo.</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Sincronizar Parque
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Unidades Activas</CardTitle>
            <CardDescription>Listado global ordenado cronológicamente por ingreso al taller.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Patente</TH>
                  <TH>Vehículo / Modelo</TH>
                  <TH>Kilometraje</TH>
                  <TH>Propietario Asociado</TH>
                </TR>
              </THead>
              <TBody>
                {vehiculos.map((veh) => {
                  const owner = clientes.find((c) => c.id_cliente === veh.id_cliente);
                  return (
                    <TR key={veh.id_vehiculo} className="hover:bg-muted/40 transition-colors">
                      <TD className="font-mono font-bold tracking-wider text-sm">
                        <span className="bg-amber-100 border border-amber-300 text-amber-950 px-2 py-0.5 rounded text-xs">
                          {veh.patente}
                        </span>
                      </TD>
                      <TD>
                        <div className="font-medium">{veh.marca} {veh.modelo}</div>
                        <div className="text-xs text-muted-foreground">Año: {veh.anio} | Color: {veh.color || "-"}</div>
                      </TD>
                      <TD className="font-mono text-xs text-right font-semibold">
                        {veh.kilometraje.toLocaleString("es-CL")} Km
                      </TD>
                      <TD className="text-xs">
                        {owner ? (
                          <div>
                            <p className="font-medium text-slate-900">{owner.nombre}</p>
                            <p className="text-muted-foreground">{owner.rut}</p>
                          </div>
                        ) : (
                          <span className="text-destructive font-mono">ID Cliente: {veh.id_cliente}</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
                {!vehiculos.length && (
                  <TR>
                    <TD colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                      No se encuentran vehículos enrolados en el sistema central.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alta de Vehículo</CardTitle>
            <CardDescription>Asignación y vinculación relacional obligatoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEnroll} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="id_cliente">Asignar Propietario</Label>
                <select
                  id="id_cliente"
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.id_cliente}
                  onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
                  required
                >
                  <option value="">Seleccionar Propietario...</option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} ({c.rut})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="patente">Patente (Formato chileno)</Label>
                <Input
                  id="patente"
                  value={form.patente}
                  onChange={(e) => setForm({ ...form, patente: e.target.value })}
                  placeholder="BBCC11 o ABCD11"
                  maxLength={8}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    placeholder="Ej: BMW"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    placeholder="Ej: M3"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="anio">Año Fabricación</Label>
                  <Input
                    id="anio"
                    type="number"
                    value={form.anio}
                    onChange={(e) => setForm({ ...form, anio: e.target.value })}
                    min={1970}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="Gris Mineral"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="kilometraje">Kilometraje Inicial en Taller</Label>
                <Input
                  id="kilometraje"
                  type="number"
                  value={form.kilometraje}
                  onChange={(e) => setForm({ ...form, kilometraje: e.target.value })}
                  min={0}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="num_motor">Número de Motor (Bloque Chasis)</Label>
                <Input
                  id="num_motor"
                  value={form.num_motor}
                  onChange={(e) => setForm({ ...form, num_motor: e.target.value })}
                  placeholder="N55B30A..."
                />
              </div>

              <Button className="w-full pt-2" type="submit" disabled={loading}>
                <Car className="h-4 w-4 mr-2" /> Enrolar Vehículo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}