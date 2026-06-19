import { useEffect, useState } from 'react';
import { RefreshCcw, Send, Mail, Smartphone } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

export default function NotificacionesPage({ session }: { session: any }) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ destinatario: '', tipo: 'email', asunto: '', mensaje: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: any[] }>('/notificaciones/listar?limit=50', { auth: true });
      setNotificaciones(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/notificaciones/enviar', { method: 'POST', body: form });
      setForm({ destinatario: '', tipo: 'email', asunto: '', mensaje: '' });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notificaciones</h2>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="h-4 w-4 mr-2" /> Actualizar</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Enviar Notificación</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Destinatario</Label><Input value={form.destinatario} onChange={e => setForm({ ...form, destinatario: e.target.value })} placeholder="email@cliente.cl o +56912345678" required /></div>
            <div><Label>Tipo</Label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Asunto</Label><Input value={form.asunto} onChange={e => setForm({ ...form, asunto: e.target.value })} placeholder="Asunto del mensaje" /></div>
            <div className="sm:col-span-2"><Label>Mensaje</Label><Textarea value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} rows={3} required /></div>
            <div className="sm:col-span-2"><Button type="submit"><Send className="h-4 w-4 mr-2" /> Enviar</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <THead>
                <TR><TH>Destinatario</TH><TH>Tipo</TH><TH>Asunto</TH><TH>Estado</TH><TH>Fecha</TH></TR>
              </THead>
              <TBody>
                {notificaciones.map((n, i) => (
                  <TR key={i}>
                    <TD>{n.destinatario}</TD>
                    <TD>{n.tipo === 'email' ? <Mail className="h-4 w-4 inline mr-1" /> : <Smartphone className="h-4 w-4 inline mr-1" />}{n.tipo}</TD>
                    <TD className="max-w-xs truncate">{n.asunto || '—'}</TD>
                    <TD><Badge status={n.estado_envio === 'enviado' ? 'pagado' : 'anulado'}>{n.estado_envio}</Badge></TD>
                    <TD>{n.fecha_creacion ? new Date(n.fecha_creacion).toLocaleString('es-CL') : '—'}</TD>
                  </TR>
                ))}
                {!notificaciones.length && (<TR><TD colSpan={5} className="h-24 text-center text-muted-foreground">No hay notificaciones</TD></TR>)}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}