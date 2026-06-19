import { FormEvent, useState } from "react";
import { CarFront, Search, Loader2, CheckCircle2, Clock, Wrench, PackageCheck, } from "lucide-react";

//import { apiRequest } from "../api/client";
import { IOrdenPublica, EstadoOrden, ordenesApi, ApiError } from "../api/client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

// type PublicOrder = {
//   estado: string;
//   fecha_estimada?: string | null;
//   vehiculo?: {
//     marca?: string;
//     modelo?: string;
//     anio?: number;
//     color?: string;
//   };
// };

type Paso = {
  id: EstadoOrden;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
};

const PASOS: Paso[] = [
  { id: "pendiente",  label: "Recibido",    sublabel: "En espera de revisión", Icon: Clock },
  { id: "en_proceso", label: "En taller",   sublabel: "Reparación en curso",   Icon: Wrench },
  { id: "listo",      label: "Listo",       sublabel: "Disponible para retiro", Icon: PackageCheck },
  { id: "entregado",  label: "Entregado",   sublabel: "Vehículo retirado",     Icon: CheckCircle2 },
];

const ESTADO_INDEX: Record<EstadoOrden, number> = {
  pendiente:  0,
  en_proceso: 1,
  listo:      2,
  entregado:  3,
};


export default function ConsultaPublicaPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<IOrdenPublica | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const tokenTrimmed = token.trim();
    if (!tokenTrimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await ordenesApi.getPublic(tokenTrimmed);
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setError(
          "No encontramos ninguna orden con ese token. Revisa que esté escrito correctamente o consulta con el taller.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo consultar la orden. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  }
  
  const activeStep =
    result != null
      ? (ESTADO_INDEX[result.estado] ?? 0)
      : -1;
  

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 px-4 pb-16">
      <div className="w-full max-w-2xl space-y-6">

        {/* ── Header ── */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-200">
            <CarFront className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Estado de tu reparación
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
            Ingresa el token de seguimiento que el taller te entregó al
            dejar tu vehículo.
          </p>
        </div>

        {/* ── Formulario de búsqueda ── */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="token">Token de seguimiento</Label>
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Ej: a3f8c2d1-7b4e-..."
                    disabled={loading}
                    required
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading || !token.trim()}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Estado de carga */}
              {loading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Consultando el estado de tu vehículo…
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5">
                  <p className="text-sm font-semibold text-red-800">
                    Orden no encontrada
                  </p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ── Resultado ── */}
        {result && (
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-100 pb-4">
              <CardDescription className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                Estado actual
              </CardDescription>
              <div className="flex items-center justify-between mt-1">
                <Badge status={result.estado} className="text-sm px-3 py-1 capitalize">
                  {result.estado.replace("_", " ")}
                </Badge>
                {result.fecha_estimada && (
                  <p className="text-xs text-slate-500">
                    Retiro estimado:{" "}
                    <span className="font-semibold text-slate-700">
                      {new Intl.DateTimeFormat("es-CL", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(result.fecha_estimada))}
                    </span>
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-8">

              {/* ── Stepper de progreso ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-5">
                  Progreso de la reparación
                </p>
                <div className="relative flex items-start justify-between">
                  {/* Barra de fondo */}
                  <div
                    aria-hidden
                    className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 mx-8"
                  />
                  {/* Barra de progreso */}
                  <div
                    aria-hidden
                    className="absolute top-4 left-8 h-0.5 bg-blue-500 transition-all duration-700 ease-out"
                    style={{
                      width:
                        activeStep > 0
                          ? `calc(${(activeStep / (PASOS.length - 1)) * 100}% - 4rem)`
                          : "0%",
                    }}
                  />

                  {PASOS.map((paso, i) => {
                    const isCompleted = i < activeStep;
                    const isActive    = i === activeStep;
                    const { Icon }    = paso;

                    return (
                      <div
                        key={paso.id}
                        className="relative z-10 flex flex-col items-center gap-2.5 flex-1"
                      >
                        <div
                          className={[
                            "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                            isCompleted
                              ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                              : isActive
                              ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-200"
                              : "bg-white border-2 border-slate-200 text-slate-300",
                          ].join(" ")}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              isActive
                                ? "text-blue-700"
                                : isCompleted
                                ? "text-slate-600"
                                : "text-slate-400"
                            }`}
                          >
                            {paso.label}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                            {paso.sublabel}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Datos del vehículo ── */}
              {result.vehiculo && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Datos del vehículo
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <InfoCell label="Marca"  value={result.vehiculo.marca} />
                    <InfoCell label="Modelo" value={result.vehiculo.modelo} />
                    <InfoCell label="Año"    value={result.vehiculo.anio?.toString()} />
                    <InfoCell label="Color"  value={result.vehiculo.color} />
                  </div>
                </div>
              )}

          
            </CardContent>
          </Card>
        )}

        {/* Ayuda */}
        <p className="text-center text-xs text-slate-400">
          ¿No tienes tu token?{" "}
          <span className="font-medium text-slate-600">
            Contacta al taller con tu nombre y la patente de tu vehículo.
          </span>
        </p>
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
        {value || "—"}
      </p>
    </div>
  );
}