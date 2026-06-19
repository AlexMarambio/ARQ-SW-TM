import { useEffect, useState } from "react";
import { RefreshCcw, Send, Mail, Smartphone, Loader2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

export default function NotificacionesPage({ session }: { session: any }) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ destinatario: "", tipo: "email", asunto: "", mensaje: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: any[] }>("/notificaciones/listar?limit=50", { auth: true });
      setNotificaciones(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setNotificaciones([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiRequest("/notificaciones/enviar", { method: "POST", body: form });
      setForm({ destinatario: "", tipo: "email", asunto: "", mensaje: "" });
      load();
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Notificaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">Envía mensajes a clientes por email o SMS.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Enviar notificación</CardTitle>
            <CardDescription>El mensaje se enviará al destinatario inmediatamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Destinatario</Label>
                <Input
                  value={form.destinatario}
                  onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                  placeholder="email@cliente.cl o +56912345678"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Canal</Label>
                <div className="flex gap-2">
                  {[
                    { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
                    { value: "sms", label: "SMS", icon: <Smartphone className="h-4 w-4" /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: opt.value })}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${
                        form.tipo === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Asunto</Label>
                <Input
                  value={form.asunto}
                  onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                  placeholder="Tu vehículo está listo"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mensaje</Label>
                <Textarea
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  rows={4}
                  placeholder="Estimado cliente, su vehículo..."
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar notificación
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de envíos</CardTitle>
            <CardDescription>{notificaciones.length} notificaciones registradas.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Destinatario</TH>
                  <TH>Canal</TH>
                  <TH>Asunto</TH>
                  <TH>Estado</TH>
                  <TH>Fecha</TH>
                </TR>
              </THead>
              <TBody>
                {notificaciones.map((n, i) => (
                  <TR key={i}>
                    <TD className="text-sm text-slate-700">{n.destinatario}</TD>
                    <TD>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        {n.tipo === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                        {n.tipo}
                      </div>
                    </TD>
                    <TD className="max-w-xs truncate text-sm text-slate-600">{n.asunto || "—"}</TD>
                    <TD>
                      <Badge status={n.estado_envio === "enviado" ? "listo" : "anulado"}>
                        {n.estado_envio}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-slate-400">
                      {n.fecha_creacion ? new Date(n.fecha_creacion).toLocaleString("es-CL") : "—"}
                    </TD>
                  </TR>
                ))}
                {!notificaciones.length && (
                  <TR>
                    <TD colSpan={5} className="h-32 text-center text-slate-400">
                      {loading ? "Cargando..." : "Sin notificaciones enviadas."}
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