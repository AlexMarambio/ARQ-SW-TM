import { FormEvent, useState } from "react";
import { Wrench, Search, ArrowRight, Loader2 } from "lucide-react";

import { apiRequest, LoginResponse } from "../api/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type Props = {
  onLogin: (data: LoginResponse) => void;
  onPublicAccess: () => void;
};

export default function LoginPage({ onLogin, onPublicAccess }: Props) {
  const [email, setEmail] = useState("admin@repararia.cl");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      onLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">RepararIA</span>
        </div>

        <div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-4">
            Sistema de gestión
          </p>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Taller bajo
            <br />
            control total.
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Gestiona órdenes, inventario y clientes desde un solo lugar. Diseñado para talleres que no se pueden permitir errores.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { label: "Órdenes activas", desc: "Seguimiento en tiempo real" },
              { label: "Inventario", desc: "Alertas de stock crítico" },
              { label: "Facturación", desc: "Registro automático de pagos" },
            ].map((item) => (
              <div key={item.label} className="border border-slate-800 rounded-xl p-4">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} RepararIA · Todos los derechos reservados
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">RepararIA</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Bienvenido</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa tus credenciales para continuar.</p>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@repararia.cl"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Ingresar <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              className="w-full"
              type="button"
              variant="outline"
              onClick={onPublicAccess}
            >
              <Search className="h-4 w-4" />
              Consultar estado de vehículo
            </Button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Acceso restringido a personal autorizado
          </p>
        </div>
      </div>
    </main>
  );
}