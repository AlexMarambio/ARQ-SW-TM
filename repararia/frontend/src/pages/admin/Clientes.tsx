import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Search, Edit2, Check, TriangleAlert, X, Loader2 } from "lucide-react";
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
  session: { rol: "administrador" | "mecanico" | "sysadmin"; userId: number } | null;
}

export default function ClientesPage({ session }: ClientesPageProps) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ rut: "", nombre: "", email: "", telefono: "", direccion: "" });

  async function loadClientes() {
    if (!isAuthorized) return;
    setLoading(true); setError(null);
    try {
      const data = await apiRequest<Cliente[]>("/cliente/list_clientes", { auth: true });
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar clientes.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (isAuthorized) void loadClientes(); }, [isAuthorized]);

  const filteredClientes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter((c) =>
      c.nombre.toLowerCase().includes(q) || c.rut.toLowerCase().includes(q),
    );
  }, [clientes, searchQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAuthorized) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      if (editingId !== null) {
        await apiRequest(`/cliente/update_cliente/${editingId}`, { method: "PUT", body: form });
        setMessage("Cliente actualizado correctamente.");
      } else {
        await apiRequest("/cliente/create_cliente", { method: "POST", body: form });
        setMessage("Cliente registrado correctamente.");
      }
      cancelEdit();
      await loadClientes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el cliente.");
    } finally { setLoading(false); }
  }

  function startEdit(c: Cliente) {
    setEditingId(c.id_cliente);
    setForm({ rut: c.rut, nombre: c.nombre, email: c.email, telefono: c.telefono || "", direccion: c.direccion || "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ rut: "", nombre: "", email: "", telefono: "", direccion: "" });
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Acceso denegado</p>
          <p className="text-xs mt-0.5 text-red-600">No tienes permisos para gestionar clientes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administra el registro de clientes del taller.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadClientes} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4 shrink-0" /> {message}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Clientes registrados</CardTitle>
                <CardDescription>{filteredClientes.length} resultado{filteredClientes.length !== 1 ? "s" : ""}</CardDescription>
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o RUT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>RUT</TH>
                  <TH>Nombre</TH>
                  <TH>Contacto</TH>
                  <TH className="w-12"></TH>
                </TR>
              </THead>
              <TBody>
                {filteredClientes.map((c) => (
                  <TR key={c.id_cliente} className={editingId === c.id_cliente ? "bg-blue-50" : ""}>
                    <TD><span className="font-mono text-xs text-slate-500">{c.rut}</span></TD>
                    <TD className="font-medium text-slate-900">{c.nombre}</TD>
                    <TD>
                      <p className="text-xs text-slate-500">{c.email}</p>
                      {c.telefono && <p className="text-xs font-medium text-slate-700">{c.telefono}</p>}
                    </TD>
                    <TD>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)} disabled={loading}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TD>
                  </TR>
                ))}
                {!filteredClientes.length && (
                  <TR>
                    <TD colSpan={4} className="h-32 text-center text-slate-400">
                      {loading ? "Cargando..." : "Sin resultados."}
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editingId !== null ? "Editar cliente" : "Nuevo cliente"}</CardTitle>
            <CardDescription>
              {editingId !== null ? `Modificando cliente #${editingId}` : "Completa los datos para registrar."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: "rut", label: "RUT", placeholder: "12345678-K", key: "rut" },
                { id: "nombre", label: "Nombre completo", placeholder: "Alejandro Marambio", key: "nombre" },
                { id: "email", label: "Correo electrónico", placeholder: "cliente@ejemplo.cl", key: "email", type: "email" },
                { id: "telefono", label: "Teléfono (opcional)", placeholder: "+56912345678", key: "telefono" },
                { id: "direccion", label: "Dirección (opcional)", placeholder: "Av. Ejército 441, Santiago", key: "direccion" },
              ].map(({ id, label, placeholder, key, type }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    type={type ?? "text"}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    required={key !== "telefono" && key !== "direccion"}
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingId !== null ? "Guardar cambios" : "Registrar cliente"}
                </Button>
                {editingId !== null && (
                  <Button type="button" variant="outline" size="icon" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
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