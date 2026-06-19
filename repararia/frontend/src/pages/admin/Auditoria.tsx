import { useEffect, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

interface Evento {
  id_auditoria: number;
  id_usuario: number;
  accion: string;
  entidad: string;
  detalle: string;
  fecha_hora: string;
}

export default function AuditoriaPage({ session }: { session: any }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [entidad, setEntidad] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Evento[] }>('/auditoria/historial?limit=100', { auth: true });
      setEventos(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = eventos.filter(e => {
    const matchSearch = e.accion.toLowerCase().includes(search.toLowerCase()) || e.detalle.toLowerCase().includes(search.toLowerCase());
    const matchEntidad = entidad ? e.entidad === entidad : true;
    return matchSearch && matchEntidad;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Auditoría</h2>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="h-4 w-4 mr-2" /> Actualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Eventos</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={entidad} onChange={e => setEntidad(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm">
              <option value="">Todas las entidades</option>
              <option value="cliente">Cliente</option>
              <option value="vehiculo">Vehículo</option>
              <option value="orden_trabajo">Orden</option>
              <option value="repuesto">Repuesto</option>
              <option value="factura">Factura</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Usuario</TH>
                  <TH>Acción</TH>
                  <TH>Entidad</TH>
                  <TH>Detalle</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map(e => (
                  <TR key={e.id_auditoria}>
                    <TD className="whitespace-nowrap">{new Date(e.fecha_hora).toLocaleString('es-CL')}</TD>
                    <TD>#{e.id_usuario}</TD>
                    <TD><Badge status={e.accion === 'CREATE' ? 'pendiente' : e.accion === 'DELETE' ? 'anulado' : 'en_taller'}>{e.accion}</Badge></TD>
                    <TD>{e.entidad}</TD>
                    <TD className="max-w-xs truncate">{e.detalle}</TD>
                  </TR>
                ))}
                {!filtered.length && (
                  <TR><TD colSpan={5} className="h-24 text-center text-muted-foreground">No hay eventos</TD></TR>
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}