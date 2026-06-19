import { useEffect, useState } from "react";
import { RefreshCcw, AlertTriangle, Check, TriangleAlert, Package, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Input } from "../../components/ui/input";

interface Repuesto {
  id_repuesto: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  proveedor?: string;
}

interface Props {
  session: { rol: "administrador" | "mecanico" | "sysadmin"; userId: number } | null;
}

export default function InventarioPage({ session }: Props) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [alertas, setAlertas] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState("");

  async function loadInventario() {
    if (!isAuthorized) return;
    setLoading(true); setError(null);
    try {
      const [globalData, alertasData] = await Promise.all([
        apiRequest<{ items: Repuesto[] }>("/repuesto/list_repuestos?limit=100", { auth: true }),
        apiRequest<Repuesto[]>("/repuesto/stock_repuesto?umbral=5", { auth: true }),
      ]);
      setRepuestos(globalData?.items ?? []);
      setAlertas(Array.isArray(alertasData) ? alertasData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el inventario.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (isAuthorized) void loadInventario(); }, [isAuthorized]);

  async function patchStock(id_repuesto: number, nuevoStock: number) {
    setLoading(true); setError(null); setMessage(null);
    try {
      await apiRequest(`/repuesto/ajustar_stock_by/${id_repuesto}`, {
        method: "PUT",
        body: { stock_actual: nuevoStock },
      });
      setMessage(`Stock actualizado para el repuesto #${id_repuesto}.`);
      setUpdatingId(null);
      await loadInventario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ajustar el stock.");
    } finally { setLoading(false); }
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Acceso denegado</p>
          <p className="text-xs mt-0.5 text-red-600">No tienes permisos para gestionar el inventario.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control de stock y alertas de reposición.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadInventario} disabled={loading}>
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

      {alertas.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {alertas.length} repuesto{alertas.length !== 1 ? "s" : ""} bajo el mínimo
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {alertas.map((a) => a.nombre).join(", ")}. Considera reponer el stock pronto.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Componentes en almacén</CardTitle>
          <CardDescription>{repuestos.length} repuestos catalogados.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Código</TH>
                <TH>Nombre</TH>
                <TH>Precio</TH>
                <TH>Stock</TH>
                <TH className="text-center">Ajustar</TH>
              </TR>
            </THead>
            <TBody>
              {repuestos.map((rep) => {
                const isCritical = rep.stock_actual <= rep.stock_minimo;
                return (
                  <TR key={rep.id_repuesto} className={isCritical ? "bg-red-50/30" : ""}>
                    <TD>
                      <span className="font-mono text-xs font-bold text-slate-500">{rep.codigo}</span>
                    </TD>
                    <TD>
                      <p className="font-medium text-slate-900">{rep.nombre}</p>
                      {rep.proveedor && (
                        <p className="text-xs text-slate-400 mt-0.5">Prov: {rep.proveedor}</p>
                      )}
                    </TD>
                    <TD>
                      <span className="font-mono text-xs text-slate-700">
                        {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(rep.precio_unitario)}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${isCritical ? "text-red-600" : "text-slate-900"}`}>
                          {rep.stock_actual}
                        </span>
                        <span className="text-xs text-slate-400">/ {rep.stock_minimo} min</span>
                        {isCritical && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            CRÍTICO
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD className="text-center">
                      {updatingId === rep.id_repuesto ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Input
                            type="number"
                            value={stockValue}
                            onChange={(e) => setStockValue(e.target.value)}
                            className="h-8 w-20 text-center font-mono"
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => patchStock(rep.id_repuesto, Number(stockValue))}
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setUpdatingId(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setUpdatingId(rep.id_repuesto); setStockValue(rep.stock_actual.toString()); }}
                          disabled={loading}
                        >
                          Ajustar
                        </Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
              {!repuestos.length && (
                <TR>
                  <TD colSpan={5} className="h-32 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-slate-300" />
                      {loading ? "Cargando inventario..." : "Sin repuestos catalogados."}
                    </div>
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