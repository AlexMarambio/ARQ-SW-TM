import { FormEvent, useState } from "react";
import { CarFront, Search, Loader2 } from "lucide-react";

import { apiRequest } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type PublicOrder = {
  estado: string;
  fecha_estimada?: string | null;
  vehiculo?: {
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
  };
};

export default function ConsultaPublicaPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiRequest<PublicOrder>(
        `/ordenes/publica/${encodeURIComponent(token.trim())}`,
        { auth: false },
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se encontró la orden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 mb-4">
            <CarFront className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Consulta de estado</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto">
            Ingresa el token que el taller te entregó para ver el estado de tu vehículo.
          </p>
        </div>

        {/* Search card */}
        <Card>
          <CardContent className="p-6">
            <form className="flex gap-3" onSubmit={submit}>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="token">Token de seguimiento</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Ej: a3f8c2d1-..."
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardDescription>Estado actual del vehículo</CardDescription>
                  <div className="mt-2">
                    <Badge status={result.estado} className="text-sm px-3 py-1">
                      {result.estado}
                    </Badge>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <CarFront className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoCell label="Marca" value={result.vehiculo?.marca} />
                <InfoCell label="Modelo" value={result.vehiculo?.modelo} />
                <InfoCell label="Año" value={result.vehiculo?.anio?.toString()} />
                <InfoCell label="Color" value={result.vehiculo?.color} />
                <InfoCell
                  label="Retiro estimado"
                  value={result.fecha_estimada
                    ? new Intl.DateTimeFormat("es-CL").format(new Date(result.fecha_estimada))
                    : undefined}
                  span={2}
                />
              </div>

              <p className="mt-5 text-xs text-slate-400 border-t border-slate-100 pt-4">
                Esta consulta solo muestra información operativa. No incluye datos personales del cliente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
  span,
}: {
  label: string;
  value?: string | null;
  span?: number;
}) {
  return (
    <div
      className="rounded-lg bg-slate-50 border border-slate-100 p-3"
      style={span ? { gridColumn: `span ${span}` } : undefined}
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "—"}</p>
    </div>
  );
}