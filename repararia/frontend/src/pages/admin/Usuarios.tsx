import { useEffect, useState } from 'react';
import { RefreshCcw, UserPlus } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: 'administrador' | 'mecanico' | 'sysadmin';
  activo: boolean;
}

export default function UsuariosPage({ session }: { session: any }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'mecanico' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Usuario[] }>('/auth/users', { auth: true });
      setUsuarios(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setUsuarios([
        { id_usuario: 1, nombre: 'Admin', email: 'admin@repararia.cl', rol: 'administrador', activo: true },
        { id_usuario: 2, nombre: 'Mecánico 1', email: 'mecanico1@repararia.cl', rol: 'mecanico', activo: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/register', { method: 'POST', body: form });
      setShowForm(false);
      setForm({ nombre: '', email: '', password: '', rol: 'mecanico' });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="h-4 w-4 mr-2" /> Actualizar</Button>
          <Button onClick={() => setShowForm(!showForm)}><UserPlus className="h-4 w-4 mr-2" /> Nuevo Usuario</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Crear Usuario</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
              <div><Label>Contraseña</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>
              <div><Label>Rol</Label>
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value as any })} className="input">
                  <option value="administrador">Administrador</option>
                  <option value="mecanico">Mecánico</option>
                  <option value="sysadmin">Sysadmin</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit">Crear</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <THead>
                <TR><TH>ID</TH><TH>Nombre</TH><TH>Email</TH><TH>Rol</TH><TH>Estado</TH></TR>
              </THead>
              <TBody>
                {usuarios.map(u => (
                  <TR key={u.id_usuario}>
                    <TD>#{u.id_usuario}</TD>
                    <TD>{u.nombre}</TD>
                    <TD>{u.email}</TD>
                    <TD><Badge status={u.rol === 'administrador' ? 'en_taller' : u.rol === 'sysadmin' ? 'pendiente' : 'listo'}>{u.rol}</Badge></TD>
                    <TD><Badge status={u.activo ? 'pagado' : 'anulado'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></TD>
                  </TR>
                ))}
                {!usuarios.length && (<TR><TD colSpan={5} className="h-24 text-center text-muted-foreground">No hay usuarios</TD></TR>)}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}