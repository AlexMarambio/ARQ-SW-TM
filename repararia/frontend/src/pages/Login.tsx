import { FormEvent, useState } from "react";
import { LockKeyhole, Search } from "lucide-react";

import { apiRequest, LoginResponse } from "../api/client";
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
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col justify-center">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="max-w-xl text-4xl font-semibold tracking-normal">
            RepararIA
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            Gestion operativa para talleres mecanicos especializados.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <Metric label="Ordenes" value="Activas" />
            <Metric label="Inventario" value="Stock" />
            <Metric label="Clientes" value="Seguimiento" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesion</CardTitle>
            <CardDescription>Acceso interno para administradores y mecanicos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Validando..." : "Entrar"}
              </Button>
              <Button
                className="w-full"
                type="button"
                variant="outline"
                onClick={onPublicAccess}
              >
                <Search className="h-4 w-4" />
                Consulta publica
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
