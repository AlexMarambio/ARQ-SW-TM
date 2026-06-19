import {
  ClipboardList,
  LogOut,
  Search,
  ShieldCheck,
  Wrench,
  Users,
  Car,
  Box,
  MessageSquareCode,
  FileText,
  Bell,
  Shield,
  UserCog,
  LayoutDashboard,
} from "lucide-react";
import { useMemo, useState } from "react";

import { apiRequest, LoginResponse, setAccessToken } from "./api/client";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import OrdenesPage from "./pages/Ordenes";
import ConsultaPublicaPage from "./pages/ConsultaPublica";

import ClientesPage from "./pages/admin/Clientes";
import VehiculosPage from "./pages/admin/Vehiculos";
import InventarioPage from "./pages/admin/Inventario";
import IaNegocio from "./pages/admin/IaNegocio";

import FacturacionPage from "./pages/admin/Facturacion";
import AuditoriaPage from "./pages/admin/Auditoria";
import UsuariosPage from "./pages/admin/Usuarios";
import NotificacionesPage from "./pages/admin/Notificaciones";
import DashboardMecanico from "./pages/mecanico/DashboardMecanico";
import IaTecnicoPage from "./pages/mecanico/IaTecnico";

type Session = {
  userId: number;
  rol: LoginResponse["user"]["rol"];
  nombre: string;
};

type View =
  | "dashboard"
  | "ordenes"
  | "publica"
  | "clientes"
  | "vehiculos"
  | "inventario"
  | "ia_negocio"
  | "facturacion"
  | "notificaciones"
  | "auditoria"
  | "usuarios"
  | "dashboard_mecanico"
  | "ia_tecnico";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("dashboard");

  const navItems = useMemo(() => {
    if (!session) {
      return [
        { id: "publica" as const, label: "Consulta pública", icon: Search },
      ];
    }

    if (session.rol === "administrador" || session.rol === "sysadmin") {
      return [
        { id: "dashboard" as const, label: "Dashboard", icon: ClipboardList },
        { id: "ordenes" as const, label: "Órdenes", icon: Wrench },
        { id: "clientes" as const, label: "Clientes", icon: Users },
        { id: "vehiculos" as const, label: "Vehículos", icon: Car },
        { id: "inventario" as const, label: "Inventario", icon: Box },
        { id: "facturacion" as const, label: "Facturación", icon: FileText },
        // { id: "notificaciones" as const, label: "Notificaciones", icon: Bell },
        { id: "auditoria" as const, label: "Auditoría", icon: Shield },
        { id: "usuarios" as const, label: "Usuarios", icon: UserCog },
        {
          id: "ia_negocio" as const,
          label: "IA Negocio",
          icon: MessageSquareCode,
        },
        { id: "publica" as const, label: "Consulta pública", icon: Search },
      ];
    }

    if (session.rol === "mecanico") {
      return [
        {
          id: "dashboard_mecanico" as const,
          label: "Mi Panel",
          icon: LayoutDashboard,
        },
        { id: "ordenes" as const, label: "Mis Órdenes", icon: Wrench },
        {
          id: "ia_tecnico" as const,
          label: "IA Técnico",
          icon: MessageSquareCode,
        },
        { id: "publica" as const, label: "Consulta pública", icon: Search },
      ];
    }

    return [];
  }, [session]);

  async function handleLogin(data: LoginResponse) {
    setAccessToken(data.token);
    setSession({
      userId: data.user.id,
      rol: data.user.rol,
      nombre: data.user.nombre,
    });
    if (data.user.rol === "mecanico") {
      setView("dashboard_mecanico");
    } else {
      setView("dashboard");
    }
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("dashboard")}
              >
                Iniciar sesion
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {view === "dashboard" && session && <DashboardPage />}
        {view === "ordenes" && session && <OrdenesPage />}
        {view === "publica" && <ConsultaPublicaPage />}
        {view === "clientes" && session && <ClientesPage session={session} />}
        {view === "vehiculos" && session && <VehiculosPage session={session} />}
        {view === "inventario" && session && (
          <InventarioPage session={session} />
        )}
        {view === "ia_negocio" && session && <IaNegocio session={session} />}
        {view === "facturacion" && session && (
          <FacturacionPage session={session} />
        )}
        {view === "auditoria" && session && <AuditoriaPage session={session} />}
        {view === "usuarios" && session && <UsuariosPage session={session} />}
        {/* {view === "notificaciones" && session && <NotificacionesPage session={session} />} */}
        {view === "dashboard_mecanico" && session && (
          <DashboardMecanico session={session} />
        )}
        {view === "ia_tecnico" && session && (
          <IaTecnicoPage session={session} />
        )}
      </main>
    </div>
  );
}
