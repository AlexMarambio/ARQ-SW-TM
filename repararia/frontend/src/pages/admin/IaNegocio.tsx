/**
 * IaNegocio.tsx — Módulo de Inteligencia Analítica Conversacional
 * RepararIA · CRM/ERP para Talleres Mecánicos
 *
 * Arquitectura:
 *  Cliente React → HTTP POST /ia/negocio/consulta (API Gateway FastAPI)
 *                → Bridge de frontera inyecta payload como trama JSON
 *                  en socket TCP nativo hacia Bus SOA (microservicio ia)
 *
 * Acceso restringido a roles: administrador | sysadmin
 */

import {
  FormEvent,
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";
import {
  MessageSquareCode,
  Send,
  Bot,
  User,
  RefreshCw,
  TriangleAlert,
  Trash2,
  Sparkles,
  ChevronRight,
  Clock,
  WifiOff,
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
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";

// ─────────────────────────────────────────────
// CONTRATOS DE TIPOS ESTRICTOS
// ─────────────────────────────────────────────

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface IaNegocioPageProps {
  session: {
    rol: "administrador" | "mecanico" | "sysadmin";
    userId: number;
    nombre: string;
  } | null;
}

/** Payload de envío al Bridge de IA */
interface ConsultaPayload {
  //consulta: string;
  pregunta: string;
}

/** Payload de retorno del microservicio RAG */
interface RespuestaPayload {
  respuesta: string;
}

// ─────────────────────────────────────────────
// CONSTANTES DE DOMINIO
// ─────────────────────────────────────────────

const MENSAJE_BIENVENIDA: Message = {
  id: "init-msg",
  sender: "bot",
  text: "Bienvenido al asistente analítico de RepararIA. Estoy conectado de forma síncrona al bus interno del sistema.\n\nPuede consultarme reportes financieros, carga de trabajo por mecánico, análisis crítico de materiales o cualquier métrica operacional en lenguaje natural.",
  timestamp: new Date(),
} as const;

/** Consultas predefinidas para acelerar la interacción del administrador */
const CONSULTAS_SUGERIDAS: readonly string[] = [
  "¿Cuál es el mecánico con más órdenes completadas este mes?",
  "¿Qué repuestos están bajo el stock mínimo crítico?",
  "¿Cuántas órdenes de trabajo están pendientes hoy?",
  "Muéstrame los ingresos del taller en los últimos 30 días",
  "¿Cuáles son los vehículos con más visitas recurrentes?",
  "Tiempo promedio de resolución de órdenes por mecánico",
] as const;

const MAX_INPUT_LENGTH = 500;

// ─────────────────────────────────────────────
// PERSISTENCIA LOCAL DEL HISTORIAL
// ─────────────────────────────────────────────

const STORAGE_KEY = "repararia_chat_negocio_v1";
const MAX_MENSAJES_GUARDADOS = 100; // evita que el localStorage crezca sin límite

/** Serializa mensajes a JSON-safe (Date → ISO string) */
function serializarMensajes(messages: Message[]): string {
  return JSON.stringify(
    messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
  );
}

/** Reconstruye mensajes desde localStorage (ISO string → Date) */
function deserializarMensajes(raw: string): Message[] {
  try {
    const parsed = JSON.parse(raw) as Array<
      Omit<Message, "timestamp"> & { timestamp: string }
    >;
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [MENSAJE_BIENVENIDA];
  }
}

/** Carga el historial guardado, o el mensaje de bienvenida si no hay nada */
function cargarHistorialInicial(): Message[] {
  if (typeof window === "undefined") return [MENSAJE_BIENVENIDA];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [MENSAJE_BIENVENIDA];
  const mensajes = deserializarMensajes(raw);
  return mensajes.length > 0 ? mensajes : [MENSAJE_BIENVENIDA];
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function IaNegocioPage({ session }: IaNegocioPageProps) {
  // ── Guardia RBAC ──────────────────────────
  const isAuthorized =
    session?.rol === "administrador" || session?.rol === "sysadmin";

  // ── Estado del chat ───────────────────────
  const [messages, setMessages] = useState<Message[]>(cargarHistorialInicial);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);

  // ── Referencias DOM ───────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      // Si supera el límite, conserva solo los más recientes
      const aGuardar =
        messages.length > MAX_MENSAJES_GUARDADOS
          ? messages.slice(-MAX_MENSAJES_GUARDADOS)
          : messages;
      window.localStorage.setItem(STORAGE_KEY, serializarMensajes(aGuardar));
    } catch (err) {
      // localStorage puede fallar si está lleno o en modo privado estricto
      console.warn("No se pudo guardar el historial del chat:", err);
    }
  }, [messages]);

  // ── Auto-scroll al fondo del historial ────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // ── Gestión del envío de consulta ─────────
  const handleSend = useCallback(
    async (e: FormEvent | null, overrideQuery?: string): Promise<void> => {
      e?.preventDefault();

      const userQuery = (overrideQuery ?? input).trim();
      if (!userQuery || !isAuthorized || loading) return;

      setInput("");
      setError(null);
      setShowSuggestions(false);

      // Añade el mensaje del usuario de forma inmutable
      const userMessage: Message = {
        id: `usr-${Date.now()}`,
        sender: "user",
        text: userQuery,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        // ── Invocación al Bridge del API Gateway ──
        // El Gateway traduce este payload HTTP a una trama binaria JSON
        // e inyecta síncronamente en el socket TCP del Bus SOA (microservicio ia).
        const data = await apiRequest<RespuestaPayload>(
          "/ia/ia/negocio/consulta",
          {
            method: "POST",
            body: { pregunta: userQuery } satisfies ConsultaPayload,
            auth: true,
          },
        );

        const textoNormalizado = normalizarRespuesta(data?.respuesta);

        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text:
            textoNormalizado ??
            "El microservicio RAG no retornó una respuesta estructurada para esta consulta. Intente reformular la pregunta.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Fallo de inferencia: timeout o error en la traducción del payload hacia el Bus SOA.";
        setError(errorMsg);
      } finally {
        setLoading(false);
        // Devuelve el foco al campo de entrada tras la respuesta
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, isAuthorized, loading],
  );

  function normalizarRespuesta(value: unknown): string {
    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
      return value
        .map((bloque) => {
          if (typeof bloque === "string") return bloque;
          if (bloque && typeof bloque === "object" && "text" in bloque) {
            return String((bloque as { text: unknown }).text ?? "");
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }

    if (value && typeof value === "object" && "text" in value) {
      return String((value as { text: unknown }).text ?? "");
    }

    return "";
  }

  /** Atajos de teclado: Ctrl+Enter para enviar */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(null);
      }
    },
    [handleSend],
  );

  /** Limpiar conversación, conservando solo el mensaje de bienvenida */
  const handleClearConversation = useCallback((): void => {
    const mensajeReiniciado = {
      ...MENSAJE_BIENVENIDA,
      timestamp: new Date(),
    };
    setMessages([mensajeReiniciado]);
    setError(null);
    setShowSuggestions(true);

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op si falla
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  /** Inyectar consulta sugerida en el input */
  const handleSuggestionClick = useCallback(
    (suggestion: string): void => {
      handleSend(null, suggestion);
    },
    [handleSend],
  );

  const charactersLeft = MAX_INPUT_LENGTH - input.length;
  const isNearLimit = charactersLeft <= 80;

  // ─────────────────────────────────────────
  // BLOQUE 403 — ACCESO DENEGADO
  // ─────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-destructive max-w-2xl">
        <TriangleAlert className="h-6 w-6 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-base tracking-tight">
            403 Forbidden — Acceso Denegado por Privilegios
          </h3>
          <p className="text-sm leading-relaxed text-destructive/80">
            Su rol actual (
            <code className="font-mono bg-destructive/10 px-1 py-0.5 rounded text-xs">
              {session?.rol ?? "sin sesión"}
            </code>
            ) no posee los privilegios requeridos para consultar métricas e
            inteligencia analítica de la organización. Esta sección está
            reservada exclusivamente para perfiles{" "}
            <strong>administrador</strong> y <strong>sysadmin</strong>.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // RENDER PRINCIPAL — CONSOLA CONVERSACIONAL
  // ─────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ── Encabezado de sección ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Asistente Conversacional Corporativo
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Asistente de toma de decisiones basado en inteligencia artificial
          </p>
        </div>
      </div>

      {/* ── Banner de error de red ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-xs uppercase tracking-wide">
              Error de Infraestructura Distribuida
            </p>
            <p className="text-xs leading-relaxed text-destructive/90">
              {error}
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 text-destructive/60 hover:text-destructive transition-colors text-xs"
            aria-label="Cerrar error"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Tarjeta principal ── */}
      <Card className="border shadow-lg overflow-hidden">
        {/* ─── Header de la consola ─── */}
        <CardHeader className="border-b py-4 px-5 bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
                <MessageSquareCode className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-100">
                  Consola de Decisión Estratégica
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Motor LLM · RAG integrado · SOA Bridge activo
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Contador de mensajes */}
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {messages.length - 1} consulta
                {messages.length - 1 !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearConversation}
                disabled={loading}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs gap-1.5 h-7 px-2.5"
                title="Limpiar conversación"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ─── Área de burbujas ─── */}
          <div
            ref={scrollRef}
            className="px-5 py-4 h-[440px] overflow-y-auto space-y-4 bg-slate-50/40 scroll-smooth"
            role="log"
            aria-label="Historial de conversación"
            aria-live="polite"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[88%] ${
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-800 text-slate-200 border border-slate-700"
                    }`}
                    aria-hidden="true"
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Burbuja de mensaje */}
                  <div
                    className={`group relative p-3.5 rounded-xl text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-white border border-slate-200 rounded-tl-sm text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div
                      className={`flex items-center gap-1 mt-2 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <Clock
                        className={`h-2.5 w-2.5 ${
                          isUser
                            ? "text-primary-foreground/50"
                            : "text-muted-foreground/60"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-mono ${
                          isUser
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground/70"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ─── Indicador de inferencia asíncrona ─── */}
            {loading && (
              <div
                className="flex gap-3 max-w-[88%] mr-auto items-start"
                role="status"
                aria-label="RepararIA está procesando"
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 rounded-tl-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Pensando... Traduciendo semántica a tramas TCP...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Sugerencias predefinidas (estado inicial) ─── */}
            {showSuggestions && messages.length === 1 && !loading && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Consultas sugeridas para comenzar</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {CONSULTAS_SUGERIDAS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={loading}
                      className="group flex items-center gap-2.5 text-left text-xs text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary/40 rounded-lg px-3.5 py-2.5 transition-all duration-150 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                      <span className="group-hover:text-slate-900 transition-colors">
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── Input de consulta ─── */}
          <div className="p-4 border-t bg-white">
            <form
              onSubmit={handleSend}
              className="space-y-2"
              aria-label="Formulario de consulta"
            >
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Escriba su consulta analítica (Ej: ¿Cuál es el mecánico con más órdenes este mes?)..."
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))
                  }
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="flex-1 text-sm placeholder:text-muted-foreground/60 font-medium placeholder:font-normal"
                  autoComplete="off"
                  aria-label="Campo de consulta"
                  aria-describedby="input-hint"
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 shrink-0 gap-1.5"
                  aria-label="Enviar consulta"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Enviar</span>
                </Button>
              </div>

              {/* Metadatos del input */}
              <div
                id="input-hint"
                className="flex items-center justify-between px-0.5"
              >
                <span className="text-[11px] text-muted-foreground/70">
                  Presione{" "}
                  <kbd className="px-1 py-0.5 text-[10px] bg-muted border border-muted-foreground/20 rounded font-mono">
                    Enter
                  </kbd>{" "}
                  para enviar
                </span>
                <span
                  className={`text-[11px] font-mono tabular-nums transition-colors ${
                    isNearLimit
                      ? "text-amber-600 font-semibold"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {input.length > 0 ? `${charactersLeft} restantes` : ""}
                </span>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* ── Espacio para algun tipo de nota ── */}
      <p className="text-[11px] text-muted-foreground/60 text-center font-mono"></p>
    </div>
  );
}
