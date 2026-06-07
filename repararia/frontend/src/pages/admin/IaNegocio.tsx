import { FormEvent, useState, useEffect, useRef } from "react";
import { MessageSquareCode, Send, Bot, User, RefreshCw, TriangleAlert } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

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
  } | null;
}

export default function IaNegocioPage({ session }: IaNegocioPageProps) {
  const isAuthorized = session?.rol === "administrador" || session?.rol === "sysadmin";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-msg",
      sender: "bot",
      text: "Bienvenido al asistente analítico de RepararIA. Estoy conectado de forma síncrona al bus interno del sistema. Puede consultarme reportes financieros, carga de trabajo por mecánico o análisis crítico de materiales en lenguaje natural.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  //const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll del contenedor de conversación
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !isAuthorized || loading) return;

    const userQuery = input.trim();
    setInput("");
    setError(null);

    // Adjunta mensaje local del admin
    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: userQuery,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Invocación al Bridge del API Gateway que traduce la consulta a tramas del Bus de IA
      const data = await apiRequest<{ respuesta: string }>("/ia/negocio/consulta", {
        method: "POST",
        body: { consulta: userQuery },
      });

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data?.respuesta || "No fue posible estructurar una respuesta comprensible para la consulta planteada.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo en la inferencia o traducción del payload de IA");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-semibold">Acceso Denegado (403 Privilege Violation)</h3>
          <p className="text-xs mt-1">Su rol actual no posee los privilegios requeridos para consultar métricas e inteligencia analítica de la organización.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Asistente Conversacional Corporativo</h2>
        <p className="text-sm text-muted-foreground">Traducción de lenguaje natural a consultas operacionales complejas sobre la base transaccional PostgreSQL.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card className="border shadow-md">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <MessageSquareCode className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-semibold">Consola de Decisión Estratégica</CardTitle>
              <CardDescription className="text-xs">Motor LLM de negocio integrado con la SOA</CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMessages([messages[0]])}
            className="text-muted-foreground text-xs font-medium"
          >
            Limpiar Consola
          </Button>
        </CardHeader>
        
        {/* Contenedor de Burbujas Reactivo */}
        <CardContent className="p-0">
          <div 
            ref={scrollRef} 
            className="p-4 h-[420px] overflow-y-auto space-y-4 bg-slate-50/30 scroll-smooth"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border shadow-sm"}`}>
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`p-3 rounded-lg text-sm leading-relaxed shadow-sm ${isUser ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border rounded-tl-none text-slate-800"}`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className={`block text-[10px] mt-1.5 text-right font-mono ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Indicador Asíncrono de Inferencia (Loading State) */}
            {loading && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
                <div className="p-3 rounded-lg bg-white border rounded-tl-none text-xs font-semibold text-muted-foreground tracking-wide">
                  Pensando... Traduciendo semántica a tramas TCP...
                </div>
              </div>
            )}
          </div>

          {/* Formulario de Entrada */}
          <div className="p-3 border-t bg-white">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Escriba su consulta de negocio (Ej: ¿Cuál es el mecánico con más órdenes listas este mes?)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 font-medium placeholder:font-normal"
                required
              />
              <Button type="submit" disabled={loading || !input.trim()} className="px-4">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}