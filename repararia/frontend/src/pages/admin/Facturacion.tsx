import { useEffect, useState } from "react";
import { RefreshCcw, CreditCard, FileText, Receipt, Search, CheckCircle } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

interface Factura {
  id_factura: number;
  id_orden: number;
  fecha_emision: string;
  monto_total: number;
  estado_pago: "pendiente" | "pagado" | "anulado";
  metodo_pago?: string;
}

export default function FacturacionPage({ session }: { session: any }) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ status: string; data: Factura[] }>("/facturacion/list_facturas?limit=100", { auth: true });
      setFacturas(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const registrarPago = async (id: number) => {
    try {
      await apiRequest(`/facturacion/registrar_pago/${id}`, { method: "POST", body: { metodo_pago: "transferencia" } });
      setMessage(`Pago registrado para factura #${id}.`);
      load();
    } catch (err) { console.error(err); }
  };

  const filtered = facturas.filter((f) => {
    const matchSearch = f.id_orden.toString().includes(search) || f.monto_total.toString().includes(search);
    const matchEstado = filterEstado ? f.estado_pago === filterEstado : true;
    return matchSearch && matchEstado;
  });

  const totalPagado = facturas.filter((f) => f.estado_pago === "pagado").reduce((acc, f) => acc + f.monto_total, 0);
  const pendientes = facturas.filter((f) => f.estado_pago === "pendiente").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Facturación</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro y seguimiento de pagos.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total cobrado", value: `$${totalPagado.toLocaleString("es-CL")}`, icon: <Receipt className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-50" },
          { label: "Pendientes de pago", value: pendientes, icon: <CreditCard className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50" },
          { label: "Total facturas", value: facturas.length, icon: <FileText className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">{s.label}</p>
                <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de facturas</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por N° orden o monto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>N°</TH>
                <TH>Orden</TH>
                <TH>Fecha</TH>
                <TH>Monto</TH>
                <TH>Estado</TH>
                <TH>Método</TH>
                <TH className="text-right">Acción</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((f) => (
                <TR key={f.id_factura}>
                  <TD><span className="font-mono text-xs font-semibold text-slate-500">#{f.id_factura}</span></TD>
                  <TD><span className="font-mono text-xs text-slate-500">#{f.id_orden}</span></TD>
                  <TD className="text-xs text-slate-500">{new Date(f.fecha_emision).toLocaleDateString("es-CL")}</TD>
                  <TD><span className="font-mono font-semibold text-slate-900">${f.monto_total.toLocaleString("es-CL")}</span></TD>
                  <TD><Badge status={f.estado_pago}>{f.estado_pago}</Badge></TD>
                  <TD className="text-xs text-slate-500">{f.metodo_pago || "—"}</TD>
                  <TD className="text-right">
                    {f.estado_pago === "pendiente" && (
                      <Button size="sm" variant="outline" onClick={() => registrarPago(f.id_factura)}>
                        <CreditCard className="h-3.5 w-3.5" />
                        Cobrar
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
              {!filtered.length && (
                <TR>
                  <TD colSpan={7} className="h-32 text-center text-slate-400">
                    {loading ? "Cargando facturas..." : "Sin facturas."}
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