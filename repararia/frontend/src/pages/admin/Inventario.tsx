import { useEffect, useState } from "react";
import {
  RefreshCcw,
  PackageX,
  AlertTriangle,
  Check,
  TriangleAlert,
  Loader2,
  Package,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface IRepuesto {
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

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

export default function InventarioPage({ session }: InventarioPageProps) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [repuestos, setRepuestos] = useState<IRepuesto[]>([]);
  const [alertas, setAlertas] = useState<IRepuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    sku: "",
    stock_actual: 0,
    stock_minimo: 5,
    precio_unitario: 0,
    proveedor: "",
  });

  // ── Carga de datos ──
  async function loadInventario() {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);

    try {
      const [globalRes, alertasRes] = await Promise.all([
        apiRequest<{ status: string; data: IRepuesto[] }>(
          "/repuesto/list_repuestos?limit=100",
          { auth: true },
        ),
        apiRequest<{ status: string; data: IRepuesto[] }>(
          "/repuesto/stock_repuesto?umbral=5",
          { auth: true },
        ),
      ]);

      const items = (globalRes as any)?.data || (Array.isArray(globalRes) ? globalRes : []);
      const alertas = (alertasRes as any)?.data || (Array.isArray(alertasRes) ? alertasRes : []);

      setRepuestos(items);
      setAlertas(alertas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar inventario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthorized) void loadInventario();
  }, [isAuthorized]);

  // ── Crear repuesto ──
  async function handleAddRepuesto() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/repuesto/create_repuesto", {
        method: "POST",
        body: formData, // body directo, sin wrapper
        auth: true,
      });
      setMessage("Repuesto agregado correctamente.");
      setIsAdding(false);
      setFormData({ nombre: "", sku: "", stock_actual: 0, stock_minimo: 5, precio_unitario: 0, proveedor: "" });
      await loadInventario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el repuesto.");
    } finally {
      setLoading(false);
    }
  }

  // ── Ajuste de stock ──
  async function patchStock(id_repuesto: number, nuevoStock: number) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/repuesto/ajustar_stock_by/${id_repuesto}`, {
        method: "PUT",
        body: { stock_actual: nuevoStock },
        auth: true,
      });
      setMessage(`Stock del repuesto #${id_repuesto} actualizado.`);
      setUpdatingId(null);
      await loadInventario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ajustar stock.");
    } finally {
      setLoading(false);
    }
  }

  // ── Guardia de permisos ──
  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Acceso Denegado</h3>
          <p className="text-xs mt-1">No tienes permisos para gestionar el inventario.</p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Control de Inventario</h2>
          <p className="text-sm text-muted-foreground">Monitoreo de SKU y control de stock crítico.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)} disabled={loading}>
            {isAdding ? "Cancelar" : "+ Nuevo Repuesto"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadInventario} disabled={loading}>
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nuevo Repuesto</CardTitle>
            <CardDescription>Completa los datos para agregar un nuevo ítem al inventario.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  placeholder="Filtro de aceite"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  placeholder="FIL-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Actual</Label>
                <Input
                  type="number"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Precio Unitario (CLP)</Label>
                <Input
                  type="number"
                  value={formData.precio_unitario}
                  onChange={(e) => setFormData({ ...formData, precio_unitario: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Proveedor</Label>
                <Input
                  placeholder="Bosch"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                />
              </div>
              <Button className="sm:col-span-2" onClick={handleAddRepuesto} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar Repuesto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-950 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>Alerta: {alertas.length} SKU(s) bajo el mínimo</span>
          </div>
          <p className="text-xs text-amber-900/90">
            Reponer: {alertas.map((a) => a.nombre).join(", ")}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventario General</CardTitle>
          <CardDescription>{repuestos.length} componentes registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Código</TH>
                <TH>Nombre / Descripción</TH>
                <TH>Precio</TH>
                <TH>Stock</TH>
                <TH className="text-center">Ajuste</TH>
              </TR>
            </THead>
            <TBody>
              {repuestos.map((rep) => {
                const isCritical = rep.stock_actual <= rep.stock_minimo;
                return (
                  <TR key={rep.id_repuesto} className={isCritical ? "bg-red-50/30" : ""}>
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
                          <Badge className="bg-red-600 text-white text-[10px]">STOCK CRÍTICO</Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Nivel Seguro</Badge>
                        )}
                      </div>
                    </TD>
                    <TD className="text-center">
                      {updatingId === rep.id_repuesto ? (
                        <div className="flex items-center justify-center gap-1 max-w-[150px] mx-auto">
                          <Input
                            type="number"
                            value={stockValue}
                            onChange={(e) => setStockValue(e.target.value)}
                            className="h-8 w-20 text-center font-mono"
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => patchStock(rep.id_repuesto, Number(stockValue))}
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setUpdatingId(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUpdatingId(rep.id_repuesto);
                            setStockValue(rep.stock_actual.toString());
                          }}
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