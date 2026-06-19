import { useEffect, useState } from 'react';
import { RefreshCcw, ClipboardList, CheckCircle, Clock } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

interface Orden {
  id_orden: number;
  estado: string;
  fecha_ingreso: string;
  costo_total: number;
  cliente?: string;
  patente?: string;
}

export default function DashboardMecanico({ session }: { session: any }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Orden[] }>('/ordenes/orden_list?limit=50', { auth: true });
      const all = Array.isArray(data) ? data : data?.data || [];
      setOrdenes(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const completadas = ordenes.filter(o => o.estado === 'entregado').length;
  const activas = ordenes.filter(o => o.estado !== 'entregado').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mi Panel</h2>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="h-4 w-4 mr-2" /> Actualizar</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-full"><ClipboardList className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Mis Órdenes</p><p className="text-xl font-bold">{ordenes.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-50 rounded-full"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Activas</p><p className="text-xl font-bold">{activas}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-50 rounded-full"><CheckCircle className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Completadas</p><p className="text-xl font-bold">{completadas}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <THead>
                <TR><TH>ID</TH><TH>Cliente</TH><TH>Patente</TH><TH>Estado</TH><TH>Ingreso</TH><TH className="text-right">Costo</TH></TR>
              </THead>
              <TBody>
                {ordenes.map(o => (
                  <TR key={o.id_orden}>
                    <TD>#{o.id_orden}</TD>
                    <TD>{(o as any).cliente || '—'}</TD>
                    <TD>{(o as any).patente || '—'}</TD>
                    <TD><Badge status={o.estado}>{o.estado}</Badge></TD>
                    <TD>{new Date(o.fecha_ingreso).toLocaleDateString('es-CL')}</TD>
                    <TD className="text-right font-mono">${o.costo_total.toLocaleString('es-CL')}</TD>
                  </TR>
                ))}
                {!ordenes.length && (<TR><TD colSpan={6} className="h-24 text-center text-muted-foreground">No hay órdenes asignadas</TD></TR>)}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}