import {
  FormEvent, useState, useEffect, useRef, useCallback, KeyboardEvent,
} from "react";
import {
  Send, Bot, User, RefreshCw, TriangleAlert, Trash2, Sparkles, ChevronRight, Loader2, WifiOff, MessageSquareCode,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface Props {
  session: { rol: "administrador" | "mecanico" | "sysadmin"; userId: number; nombre: string } | null;
}

const MENSAJE_BIENVENIDA: Message = {
  id: "init",
  sender: "bot",
  text: "Hola. Soy el asistente analítico de RepararIA.\n\nPuedes preguntarme sobre reportes financieros, carga de mecánicos, stock crítico o cualquier métrica del taller en lenguaje natural.",
  timestamp: new Date(),
};

const SUGERENCIAS = [
  "¿Cuál es el mecánico con más órdenes completadas este mes?",
  "¿Qué repuestos están bajo el stock mínimo?",
  "¿Cuántas órdenes están pendientes hoy?",
  "Ingresos del taller en los últimos 30 días",
  "Vehículos con más visitas recurrentes",
  "Tiempo promedio de resolución por mecánico",
] as const;

const MAX_INPUT_LENGTH = 500;
const STORAGE_KEY = "repararia_chat_negocio_v1";

export default function IaNegocioPage({ session }: Props) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [messages, setMessages] = useState<Message[]>([MENSAJE_BIENVENIDA]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  // Guardar en localStorage
  useEffect(() => {
    try {
      const toSave = messages.length > 100 ? messages.slice(-100) : messages;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }))));
    } catch {}
  }, [messages]);

  const handleSend = useCallback(async (e: FormEvent | null, override?: string) => {
    e?.preventDefault();
    const query = (override ?? input).trim();
    if (!query || !isAuthorized || loading) return;

    setInput("");
    setError(null);
    setShowSuggestions(false);

    const userMsg: Message = { id: `u-${Date.now()}`, sender: "user", text: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await apiRequest<{ respuesta: string }>("/ia/negocio/consulta", {
        method: "POST",
        body: { pregunta: query },
        auth: true,
      });
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: "bot",
        text: data?.respuesta ?? "No obtuve una respuesta del sistema. Intenta reformular la pregunta.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al contactar al asistente.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isAuthorized, loading]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(null);
    }
  }, [handleSend]);

  const clearChat = useCallback(() => {
    setMessages([{ ...MENSAJE_BIENVENIDA, timestamp: new Date() }]);
    setError(null);
    setShowSuggestions(true);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Acceso denegado</p>
          <p className="text-xs mt-0.5 text-red-600">El asistente IA está disponible solo para administradores.</p>
        </div>
      </div>
    );
  }

  const charsLeft = MAX_INPUT_LENGTH - input.length;
  const nearLimit = charsLeft <= 80;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Asistente Conversacional</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Asistente de toma de decisiones basado en IA.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-xs uppercase tracking-wide">Error</p>
            <p className="text-xs leading-relaxed text-destructive/90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-destructive/60 hover:text-destructive">✕</button>
        </div>
      )}

      <Card className="border shadow-lg overflow-hidden">
        <CardHeader className="border-b py-4 px-5 bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
                <MessageSquareCode className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-100">Consola de Decisión</CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">LLM · RAG · SOA Bridge</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearChat} disabled={loading} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs gap-1.5 h-7 px-2.5">
              <Trash2 className="h-3.5 w-3.5" /> Limpiar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div ref={scrollRef} className="px-6 py-4 h-[440px] overflow-y-auto space-y-5 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[86%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"}`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <p className={`text-[10px] mt-1.5 font-mono ${isUser ? "text-blue-200" : "text-slate-400"}`}>
                      {msg.timestamp.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 max-w-[86%] mr-auto items-start">
                <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 shrink-0">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-slate-200 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [delay-0]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [delay-150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [delay-300ms]" />
                  </div>
                </div>
              </div>
            )}

            {showSuggestions && messages.length === 1 && !loading && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Sugerencias
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGERENCIAS.map((s, i) => (
                    <button key={i} onClick={() => handleSend(null, s)} disabled={loading} className="group flex items-center gap-2 text-left text-xs text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl px-3.5 py-2.5 transition-all hover:shadow-sm">
                      <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500 shrink-0" />
                      <span className="group-hover:text-slate-900 transition-colors">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mx-6 mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="border-t border-slate-100 p-4">
            <form onSubmit={handleSend} className="space-y-2">
              <div className="flex gap-2">
                <Input ref={inputRef} placeholder="Pregunta algo sobre el taller..." value={input} onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))} onKeyDown={handleKeyDown} disabled={loading} className="flex-1" autoComplete="off" />
                <Button type="submit" disabled={loading || !input.trim()} className="shrink-0 px-3">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs text-slate-400">Presiona <kbd className="px-1 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded font-mono">Enter</kbd> para enviar</span>
                {input.length > 0 && <span className={`text-xs font-mono tabular-nums ${nearLimit ? "text-amber-600" : "text-slate-300"}`}>{charsLeft}</span>}
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}