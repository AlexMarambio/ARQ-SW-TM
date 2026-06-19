import { useEffect, useState } from "react";
import { RefreshCcw, UserPlus, X, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: "administrador" | "mecanico" | "sysadmin";
  activo: boolean;
}

const rolStatus: Record<string, string> = {
  administrador: "en_taller",
  sysadmin: "pendiente",
  mecanico: "listo",
};

export default function UsuariosPage({ session }: { session: any }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "mecanico" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Usuario[] }>("/auth/users", { auth: true });
      setUsuarios(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setUsuarios([
        { id_usuario: 1, nombre: "Admin", email: "admin@repararia.cl", rol: "administrador", activo: true },
        { id_usuario: 2, nombre: "Mecánico 1", email: "mecanico1@repararia.cl", rol: "mecanico", activo: true },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/auth/register", { method: "POST", body: form });
      setShowForm(false);
      setForm({ nombre: "", email: "", password: "", rol: "mecanico" });
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los accesos al sistema.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nuevo usuario"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Crear usuario</CardTitle>
            <CardDescription>El usuario recibirá acceso inmediato al sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Correo electrónico</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="administrador">Administrador</option>
                  <option value="mecanico">Mecánico</option>
                  <option value="sysadmin">Sysadmin</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit">
                  <UserPlus className="h-4 w-4" />
                  Crear usuario
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Nombre</TH>
                <TH>Correo</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {usuarios.map((u) => (
                <TR key={u.id_usuario}>
                  <TD><span className="font-mono text-xs text-slate-500">#{u.id_usuario}</span></TD>
                  <TD className="font-medium text-slate-900">{u.nombre}</TD>
                  <TD className="text-xs text-slate-500">{u.email}</TD>
                  <TD><Badge status={rolStatus[u.rol] ?? "pendiente"}>{u.rol}</Badge></TD>
                  <TD><Badge status={u.activo ? "pagado" : "anulado"}>{u.activo ? "Activo" : "Inactivo"}</Badge></TD>
                </TR>
              ))}
              {!usuarios.length && (
                <TR>
                  <TD colSpan={5} className="h-32 text-center text-slate-400">
                    {loading ? "Cargando..." : "Sin usuarios registrados."}
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