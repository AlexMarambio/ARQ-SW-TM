import { useEffect, useState } from "react";
import { RefreshCcw, Layers, PackageX, AlertTriangle, Check, TriangleAlert } from "lucide-react";
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
  descripcion?: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  proveedor?: string;
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
  
  // Estado para el manejo inline de ajustes rapidos de stock
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<string>("");

  async function loadInventario() {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const [globalData, alertasData] = await Promise.all([
        apiRequest<{ items: Repuesto[] }>("/repuesto/list_repuestos?limit=100", { auth: true }),
        apiRequest<Repuesto[]>("/repuesto/stock_repuesto?umbral=5", { auth: true }),
      ]);
      
      setRepuestos(globalData && Array.isArray(globalData.items) ? globalData.items : []);
      setAlertas(Array.isArray(alertasData) ? alertasData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo en el servicio distribuido de existencias");
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
      await apiRequest(`/repuesto/ajustar_stock_by/${id_repuesto}`, {
        method: "PUT",
        body: { stock_actual: nuevoStock },
      });
      setMessage(`Stock del repuesto id #${id_repuesto} modificado de forma directa en almacén`);
      setUpdatingId(null);
      await loadInventario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el ajuste de stock");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Acceso Denegado (403 Privilege Violation)</h3>
          <p className="text-xs mt-1">Su rol actual no posee los privilegios requeridos para gestionar el inventario maestro de la compañía.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Control de Inventario y Almacén</h2>
          <p className="text-sm text-muted-foreground">Monitoreo de SKU y control crítico ante quiebres de material de reposición.</p>
        </div>
        <Button variant="outline" onClick={loadInventario} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-950 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>Alerta Crítica: Se detectan {alertas.length} SKUs bajo el umbral mínimo configurado</span>
          </div>
          <p className="text-xs text-amber-900/90">
            Los siguientes insumos requieren reposición urgente con el proveedor asignado para salvaguardar la continuidad operacional de los fosos de reparación.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Inventario General de Componentes</CardTitle>
            <CardDescription>Visualización física y lógica integrada con actualización inline.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Código Fab.</TH>
                  <TH>Componente / Descripción</TH>
                  <TH>Precio Unitario</TH>
                  <TH>Estado Stock</TH>
                  <TH className="text-center">Ajuste Manual Rápido</TH>
                </TR>
              </THead>
              <TBody>
                {repuestos.map((rep) => {
                  const isCritical = rep.stock_actual <= rep.stock_minimo;
                  return (
                    <TR key={rep.id_repuesto} className={`hover:bg-muted/40 transition-colors ${isCritical ? "bg-red-50/20" : ""}`}>
                      <TD className="font-mono text-xs font-bold text-slate-700">{rep.codigo}</TD>
                      <TD>
                        <div className="font-medium">{rep.nombre}</div>
                        {rep.descripcion && <p className="text-xs text-muted-foreground">{rep.descripcion}</p>}
                        {rep.proveedor && <p className="text-[11px] text-primary/80 font-medium">Prov: {rep.proveedor}</p>}
                      </TD>
                      <TD className="font-mono text-xs font-medium">
                        {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(rep.precio_unitario)}
                      </TD>
                      <TD>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono text-xs font-bold">
                            {rep.stock_actual} / <span className="text-muted-foreground font-normal">{rep.stock_minimo} Min</span>
                          </span>
                          {isCritical ? (
                            <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide text-[10px]">
                              STOCK CRÍTICO
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[10px]">
                              Nivel Seguro
                            </Badge>
                          )}
                        </div>
                      </TD>
                      <TD className="text-center">
                        {updatingId === rep.id_repuesto ? (
                          <div className="flex items-center justify-center gap-1 max-w-[150px] mx-auto">
                            <Input
                              type="number"
                              size={5}
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              className="h-8 text-center font-mono"
                            />
                            <Button 
                              size="sm" 
                              className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => patchStock(rep.id_repuesto, Number(stockValue))}
                              disabled={loading}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => setUpdatingId(null)}
                            >
                              X
                            </Button>
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
                            disabled={loading}
                          >
                            Forzar Ajuste
                          </Button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
                {!repuestos.length && (
                  <TR>
                    <TD colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                      <div className="flex flex-col items-center justify-center gap-1 py-4">
                        <PackageX className="h-8 w-8 text-muted-foreground/60" />
                        <p>No se registran materiales catalogados en el Almacén central.</p>
                      </div>
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}