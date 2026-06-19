/**
 * IaTecnico.tsx — Asistente técnico para mecánicos
 *
 * Permite consultar manuales, procedimientos y diagnósticos
 * usando el microservicio RAG (técnico) a través del bus SOA.
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
  Send,
  Bot,
  User,
  RefreshCw,
  TriangleAlert,
  Trash2,
  Sparkles,
  ChevronRight,
  Loader2,
  Wrench,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface Props {
  session: {
    rol: "administrador" | "mecanico" | "sysadmin";
    userId: number;
    nombre: string;
  } | null;
}

const BIENVENIDA: Message = {
  id: "init",
  sender: "bot",
  text: "Hola, soy el asistente técnico de RepararIA.\n\nPuedes preguntarme sobre procedimientos de reparación, códigos de falla, especificaciones de vehículos, o cualquier duda técnica que tengas. Estoy conectado a la base de conocimiento del taller.",
  timestamp: new Date(),
};

const SUGERENCIAS = [
  "¿Cómo se cambia la correa de distribución en un BMW E36?",
  "Código de falla P0300: ¿qué significa?",
  "Especificaciones de torque para pernos de culata",
  "Procedimiento de diagnóstico de falla en el sistema de inyección",
  "¿Qué tipo de aceite lleva el motor M50?",
  "Diagrama eléctrico del sistema de encendido",
] as const;

const MAX_INPUT = 500;

export default function IaTecnicoPage({ session }: Props) {
  const isAuthorized =
    session?.rol === "mecanico" ||
    session?.rol === "administrador" ||
    session?.rol === "sysadmin";

  const [messages, setMessages] = useState<Message[]>([BIENVENIDA]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const handleSend = useCallback(
    async (e: FormEvent | null, override?: string) => {
      e?.preventDefault();
      const query = (override ?? input).trim();
      if (!query || !isAuthorized || loading) return;

      setInput("");
      setError(null);
      setShowSuggestions(false);

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const data = await apiRequest<{ respuesta: string }>("/ia/tecnico/consulta", {
          method: "POST",
          body: { pregunta: query, tenant_id: "taller_01" },
          auth: true,
        });
        const botMsg: Message = {
          id: `b-${Date.now()}`,
          sender: "bot",
          text:
            data?.respuesta ??
            "No obtuve una respuesta del sistema. Intenta reformular la pregunta.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al contactar al asistente técnico."
        );
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, isAuthorized, loading]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(null);
      }
    },
    [handleSend]
  );

  const clearChat = useCallback(() => {
    setMessages([{ ...BIENVENIDA, timestamp: new Date() }]);
    setError(null);
    setShowSuggestions(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Acceso denegado</p>
          <p className="text-xs mt-0.5 text-red-600">
            Solo personal autorizado puede usar el asistente técnico.
          </p>
        </div>
      </div>
    );
  }

  const charsLeft = MAX_INPUT - input.length;
  const nearLimit = charsLeft < 80;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Asistente Técnico IA
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consulta manuales y procedimientos del taller.
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-700">Modo Técnico</Badge>
      </div>

      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between py-4 px-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              RepararIA Técnico
            </CardTitle>
            <CardDescription>
              {messages.length - 1} consulta
              {messages.length - 1 !== 1 ? "s" : ""} en esta sesión
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        </CardHeader>

        <CardContent className="p-0 flex flex-col">
          <div
            ref={scrollRef}
            className="px-6 py-4 h-[440px] overflow-y-auto space-y-5 bg-slate-50/50"
            role="log"
            aria-live="polite"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[86%] ${
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      isUser
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <p
                      className={`text-[10px] mt-1.5 font-mono ${
                        isUser ? "text-blue-200" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {showSuggestions && messages.length === 1 && !loading && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Consultas técnicas sugeridas
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGERENCIAS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(null, s)}
                      disabled={loading}
                      className="group flex items-center gap-2 text-left text-xs text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl px-3.5 py-2.5 transition-all hover:shadow-sm"
                    >
                      <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                      <span className="group-hover:text-slate-900 transition-colors">
                        {s}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mx-6 mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="border-t border-slate-100 p-4">
            <form onSubmit={handleSend} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Pregunta técnica sobre reparaciones, códigos de falla, etc."
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="shrink-0 px-3"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs text-slate-400">
                  Presiona{" "}
                  <kbd className="px-1 py-0.5 text-[10px] bg-slate-100 border border-slate-200 rounded font-mono">
                    Enter
                  </kbd>{" "}
                  para enviar
                </span>
                {input.length > 0 && (
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      nearLimit ? "text-amber-600" : "text-slate-300"
                    }`}
                  >
                    {charsLeft}
                  </span>
                )}
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}