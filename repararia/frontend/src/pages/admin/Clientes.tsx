import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Search, Edit2, Check, TriangleAlert } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";

interface Cliente {
  id_cliente: number;
  rut: string;
  email: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  fecha_registro: string;
}

interface ClientesPageProps {
  session: {
    rol: "administrador" | "mecanico" | "sysadmin";
    userId: number;
  } | null;
}

export default function ClientesPage({ session }: ClientesPageProps) {
  
  // Acceso definido por rol
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Estados del formulario unificado
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    rut: "",
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
  });

  async function loadClientes() {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Cliente[]>("/cliente/list_clientes", { auth: true });
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar el padrón de clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      void loadClientes();
    }
  }, [isAuthorized]);

  // Filtro Dinámico Local
  const filteredClientes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return clientes;
    return clientes.filter((c) => 
      c.nombre.toLowerCase().includes(query) || 
      c.rut.toLowerCase().includes(query)
    );
  }, [clientes, searchQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (editingId !== null) {
        // UPDATE_CLIENTE enviada al Bus
        await apiRequest(`/cliente/update_cliente/${editingId}`, {
          method: "PUT",
          body: form,
        });
        setMessage("Datos del cliente actualizados correctamente en el modelo relacional");
      } else {
        // CREATE_CLIENTE enviada al Bus
        await apiRequest("/cliente/create_cliente", {
          method: "POST",
          body: form,
        });
        setMessage("Nuevo cliente registrado y enrolado en el sistema");
      }
      setForm({ rut: "", nombre: "", email: "", telefono: "", direccion: "" });
      setEditingId(null);
      await loadClientes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo de aserción en el alta/modificación del registro");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cliente: Cliente) {
    setEditingId(cliente.id_cliente);
    setForm({
      rut: cliente.rut,
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
    });
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Acceso Denegado (403 Privilege Violation)</h3>
          <p className="text-xs mt-1">Su rol actual no posee los privilegios requeridos para invocar los endpoints transaccionales del subsistema de Clientes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión del Padrón de Clientes</h2>
          <p className="text-sm text-muted-foreground">Mantenimiento de entidades e historial de contacto del taller mecánico.</p>
        </div>
        <Button variant="outline" onClick={loadClientes} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Clientes Registrados</CardTitle>
            <CardDescription>Búsqueda indexada en memoria para optimización de renderizado.</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por Nombre completo o RUT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>RUT</TH>
                  <TH>Nombre</TH>
                  <TH>Contacto</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {filteredClientes.map((cliente) => (
                  <TR key={cliente.id_cliente} className="hover:bg-muted/40 transition-colors">
                    <TD className="font-mono text-xs">{cliente.rut}</TD>
                    <TD className="font-medium">{cliente.nombre}</TD>
                    <TD className="text-xs space-y-0.5">
                      <p className="text-muted-foreground">{cliente.email}</p>
                      {cliente.telefono && <p className="font-semibold">{cliente.telefono}</p>}
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(cliente)} disabled={loading}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TD>
                  </TR>
                ))}
                {!filteredClientes.length && (
                  <TR>
                    <TD colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                      Ningún cliente coincide con los criterios de búsqueda.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId !== null ? "Modificar Entidad" : "Enrolar Nuevo Cliente"}</CardTitle>
            <CardDescription>Valores requeridos para persistencia ACID en Postgres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="rut">RUT (Con dígito verificador)</Label>
                <Input
                  id="rut"
                  value={form.rut}
                  onChange={(e) => setForm({ ...form, rut: e.target.value })}
                  placeholder="12345678-K"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre Completo / Razón Social</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Alejandro Marambio"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Correo Electrónico Único</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@repararia.cl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefono">Teléfono Móvil de Contacto</Label>
                <Input
                  id="telefono"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+56912345678"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="direccion">Dirección Particular</Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Av. Ejército 441, Santiago"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" type="submit" disabled={loading}>
                  {editingId !== null ? "Salvar Cambios" : "Confirmar Enrolamiento"}
                </Button>
                {editingId !== null && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingId(null);
                      setForm({ rut: "", nombre: "", email: "", telefono: "", direccion: "" });
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}