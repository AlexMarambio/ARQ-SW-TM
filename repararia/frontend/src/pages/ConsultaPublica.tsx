import { FormEvent, useState } from "react";
import { CarFront, Search } from "lucide-react";

import { apiRequest } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
      setError(err instanceof Error ? err.message : "No se encontro la orden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Consulta publica</CardTitle>
          <CardDescription>
            Ingresa el token entregado por el taller.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="token">Token de acceso</Label>
              <Input
                id="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="UUID de la orden"
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              <Search className="h-4 w-4" />
              {loading ? "Consultando..." : "Ver estado"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="rounded-lg border bg-white p-6">
        {result ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado actual</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  <Badge status={result.estado}>{result.estado}</Badge>
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <CarFront className="h-6 w-6" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Marca" value={result.vehiculo?.marca} />
              <Info label="Modelo" value={result.vehiculo?.modelo} />
              <Info label="Anio" value={result.vehiculo?.anio?.toString()} />
              <Info label="Color" value={result.vehiculo?.color} />
              <Info
                label="Fecha estimada"
                value={formatDate(result.fecha_estimada)}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <CarFront className="h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Estado del vehiculo</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              La consulta solo muestra datos operativos no sensibles. No usa patente,
              RUT ni nombre del cliente.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || "-"}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}
