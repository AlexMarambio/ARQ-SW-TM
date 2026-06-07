import { useEffect, useState } from "react";
import { RefreshCcw, PackageX, AlertTriangle, Check, TriangleAlert } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

interface Repuesto {
  id_repuesto: number;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
}

interface InventarioPageProps {
  session: {
    rol: "administrador" | "mecanico" | "sysadmin";
    userId: number;
  } | null;
}

export default function InventarioPage({ session }: InventarioPageProps) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [alertas, setAlertas] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<string>("");

  async function loadInventario() {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      // Rutas corregidas en singular conformes al archivo del Gateway
      const [globalData, alertasData] = await Promise.all([
        apiRequest<{ items: Repuesto[] }>("/repuesto/list_repuestos?limit=100", { auth: true }),
        apiRequest<Repuesto[]>("/repuesto/stock_repuesto?umbral=5", { auth: true }),
      ]);
      
      setRepuestos(globalData && Array.isArray(globalData.items) ? globalData.items : []);
      setAlertas(Array.isArray(alertasData) ? alertasData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar existencias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthorized) {
      void loadInventario();
    }
  }, [isAuthorized]);

  async function patchStock(id_repuesto: number, nuevoStock: number) {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      // Ruta corregida a: PUT /repuesto/ajustar_stock_by/{id_repuesto}
      await apiRequest(`/repuesto/ajustar_stock_by/${id_repuesto}`, {
        method: "PUT",
        body: { nuevo_stock: nuevoStock },
      });
      setMessage(`Existencias del componente ID #${id_repuesto} actualizadas`);
      setUpdatingId(null);
      await loadInventario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo al procesar el ajuste");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized) {
    return <div className="p-4 text-sm text-destructive bg-destructive/10 rounded">Acceso no autorizado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventario de Repuestos</h2>
        </div>
        <Button variant="outline" onClick={loadInventario} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Sincronizar
        </Button>
      </div>

      {message && <div className="p-3 text-sm rounded bg-emerald-50 text-emerald-800 border border-emerald-200">{message}</div>}
      {error && <div className="p-3 text-sm rounded bg-destructive/10 text-destructive border border-destructive/20">{error}</div>}

      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-950 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>Atención: {alertas.length} SKUs registran stock crítico.</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <THead>
              <TR>
                <TH>Código SKU</TH>
                <TH>Nombre</TH>
                <TH>Precio</TH>
                <TH>Stock</TH>
                <TH className="text-center">Ajuste Manual</TH>
              </TR>
            </THead>
            <TBody>
              {repuestos.map((rep) => {
                const isCritical = rep.stock_actual <= rep.stock_minimo;
                return (
                  <TR key={rep.id_repuesto} className={isCritical ? "bg-red-50/20" : ""}>
                    <TD className="font-mono text-xs font-bold">{rep.codigo}</TD>
                    <TD className="font-medium">{rep.nombre}</TD>
                    <TD className="font-mono text-xs">
                      {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(rep.precio_unitario)}
                    </TD>
                    <TD>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono text-xs font-bold">{rep.stock_actual} / {rep.stock_minimo}</span>
                        {isCritical && <Badge variant="destructive" className="text-[10px]">STOCK CRÍTICO</Badge>}
                      </div>
                    </TD>
                    <TD className="text-center">
                      {updatingId === rep.id_repuesto ? (
                        <div className="flex items-center justify-center gap-1 max-w-[150px] mx-auto">
                          <Input
                            type="number"
                            value={stockValue}
                            onChange={(e) => setStockValue(e.target.value)}
                            className="h-8 text-center font-mono"
                          />
                          <Button size="sm" onClick={() => patchStock(rep.id_repuesto, Number(stockValue))} disabled={loading}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setUpdatingId(null)}>X</Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold"
                          onClick={() => {
                            setUpdatingId(rep.id_repuesto);
                            setStockValue(rep.stock_actual.toString());
                          }}
                        >
                          Forzar Ajuste
                        </Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}