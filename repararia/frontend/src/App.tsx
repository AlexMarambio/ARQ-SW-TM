import { ClipboardList, LogOut, Search, ShieldCheck, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { apiRequest, LoginResponse, setAccessToken } from "./api/client";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import OrdenesPage from "./pages/Ordenes";
import ConsultaPublicaPage from "./pages/ConsultaPublica";

type Session = {
  userId: number;
  rol: LoginResponse["rol"];
};

type View = "dashboard" | "ordenes" | "publica";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("dashboard");

  const navItems = useMemo(
    () => [
      { id: "dashboard" as const, label: "Dashboard", icon: ClipboardList },
      { id: "ordenes" as const, label: "Ordenes", icon: Wrench },
      { id: "publica" as const, label: "Consulta publica", icon: Search },
    ],
    [],
  );

  async function handleLogin(data: LoginResponse) {
    setAccessToken(data.token);
    setSession({ userId: data.user_id, rol: data.rol });
    setView("dashboard");
  }

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout", { method: "POST", body: {} });
    } finally {
      setAccessToken(null);
      setSession(null);
      setView("dashboard");
    }
  }

  if (!session && view !== "publica") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onPublicAccess={() => setView("publica")}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">RepararIA</h1>
              <p className="text-sm text-muted-foreground">CRM/ERP de taller mecanico</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const disabled = !session && item.id !== "publica";
              return (
                <Button
                  key={item.id}
                  variant={view === item.id ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => setView(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <Badge>{session.rol}</Badge>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setView("dashboard")}>
                Iniciar sesion
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {view === "dashboard" && session ? <DashboardPage /> : null}
        {view === "ordenes" && session ? <OrdenesPage /> : null}
        {view === "publica" ? <ConsultaPublicaPage /> : null}
      </main>
    </div>
  );
}
