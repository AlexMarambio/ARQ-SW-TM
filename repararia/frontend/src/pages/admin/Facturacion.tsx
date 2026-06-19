import { useEffect, useState } from 'react';
import { RefreshCcw, Eye, CreditCard, FileText, Receipt, Search, CheckCircle } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

interface Factura {
  id_factura: number;
  id_orden: number;
  fecha_emision: string;
  monto_total: number;
  estado_pago: 'pendiente' | 'pagado' | 'anulado';
  metodo_pago?: string;
}

export default function FacturacionPage({ session }: { session: any }) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ status: string; data: Factura[] }>('/facturacion/list_facturas?limit=100', { auth: true });
      setFacturas(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const registrarPago = async (id: number) => {
    try {
      await apiRequest(`/facturacion/registrar_pago/${id}`, { method: 'POST', body: { metodo_pago: 'transferencia' } });
      setMessage(`Pago registrado para factura #${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = facturas.filter(f => {
    const matchSearch = f.id_orden.toString().includes(search) || f.monto_total.toString().includes(search);
    const matchEstado = filterEstado ? f.estado_pago === filterEstado : true;
    return matchSearch && matchEstado;
  });

  const totalPagado = facturas.filter(f => f.estado_pago === 'pagado').reduce((acc, f) => acc + f.monto_total, 0);
  const pendientes = facturas.filter(f => f.estado_pago === 'pendiente').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Facturación</h2>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="h-4 w-4 mr-2" /> Actualizar</Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm">
          <CheckCircle className="h-4 w-4" /> {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-emerald-50 rounded-full"><Receipt className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Total Facturado</p><p className="text-xl font-bold">${totalPagado.toLocaleString('es-CL')}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-50 rounded-full"><CreditCard className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Pendientes de Pago</p><p className="text-xl font-bold">{pendientes}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-blue-50 rounded-full"><FileText className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Facturas</p><p className="text-xl font-bold">{facturas.length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Facturas</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por N° Orden o monto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <THead>
                <TR>
                  <TH>N°</TH>
                  <TH>Orden</TH>
                  <TH>Fecha</TH>
                  <TH>Monto</TH>
                  <TH>Estado</TH>
                  <TH>Método</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map(f => (
                  <TR key={f.id_factura}>
                    <TD className="font-mono">#{f.id_factura}</TD>
                    <TD>#{f.id_orden}</TD>
                    <TD>{new Date(f.fecha_emision).toLocaleDateString('es-CL')}</TD>
                    <TD className="font-mono font-semibold">${f.monto_total.toLocaleString('es-CL')}</TD>
                    <TD><Badge status={f.estado_pago}>{f.estado_pago}</Badge></TD>
                    <TD>{f.metodo_pago || '—'}</TD>
                    <TD className="text-right">
                      {f.estado_pago === 'pendiente' && (
                        <Button size="sm" variant="secondary" onClick={() => registrarPago(f.id_factura)}>
                          <CreditCard className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
                {!filtered.length && (
                  <TR><TD colSpan={7} className="h-24 text-center text-muted-foreground">No hay facturas</TD></TR>
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}