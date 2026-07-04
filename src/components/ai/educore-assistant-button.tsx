"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Clipboard, Loader2, Send, X } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Suggestion = {
  label: string;
  prompt: string;
};

const maxMessageLength = 2000;

const suggestions: Suggestion[] = [
  {
    label: "Redactar mensaje a familia",
    prompt: "Ayudame a redactar un mensaje formal y cercano para una familia. Contexto: [describe aqui la situacion]. Objetivo del mensaje: [indica que necesitas comunicar]."
  },
  {
    label: "Mejorar observacion",
    prompt: "Mejora esta observacion docente para que sea clara, profesional y util para la familia. Texto original: [pega aqui la observacion]."
  },
  {
    label: "Generar recomendacion de refuerzo",
    prompt: "Genera recomendaciones educativas de refuerzo para este caso. Datos aportados por el docente: [describe la dificultad o necesidad]."
  },
  {
    label: "Transformar incidencia en mensaje formal",
    prompt: "Transforma esta incidencia en un mensaje formal para la familia, sin dramatizar y con tono constructivo. Incidencia: [pega aqui el texto]."
  },
  {
    label: "Preparar actividad",
    prompt: "Ayudame a preparar una actividad educativa. Curso: [indica curso]. Materia: [indica materia]. Objetivo: [indica objetivo]. Duracion aproximada: [indica tiempo]."
  },
  {
    label: "Redactar comunicado",
    prompt: "Redacta un comunicado claro y formal para familias sobre este tema: [describe el asunto]. Debe ser breve, institucional y facil de entender."
  }
];

export function EduCoreAssistantButton({ userName, role }: { userName: string | null; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const recentMessages = useMemo(() => messages.slice(-8), [messages]);
  const remainingCharacters = maxMessageLength - input.length;

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed || loading) {
      return;
    }

    if (trimmed.length > maxMessageLength) {
      setError(`El mensaje es demasiado largo. Maximo ${maxMessageLength} caracteres.`);
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: trimmed,
          history: recentMessages,
          route: pathname
        })
      });
      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "No se pudo generar la respuesta. Intentalo de nuevo.");
      }

      const reply = data.reply;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply
        }
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No se pudo generar la respuesta. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Abrir EduCore AI"
      >
        <Bot className="h-5 w-5" aria-hidden="true" />
        EduCore AI
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-[1px]" role="dialog" aria-modal="true">
          <aside className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-border bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Bot className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">EduCore Assistant</h2>
                    <p className="text-xs text-muted-foreground">{role} - {userName ?? "Usuario"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Ayuda para redactar, resumir y preparar comunicaciones educativas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white transition hover:bg-muted"
                aria-label="Cerrar asistente"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="border-b border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugerencias rapidas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => {
                      setInput(suggestion.prompt);
                      setError(null);
                    }}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] p-5">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{"\u00bfEn qu\u00e9 te ayudo?"}</p>
                  <p className="mt-2">
                    Escribe una peticion o usa una sugerencia. En esta version no se cargan datos de alumnos, notas, incidencias ni comunicaciones automaticamente.
                  </p>
                </div>
              ) : null}
              {messages.map((message) => (
                <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${message.role === "user" ? "border-primary/25 bg-primary/5" : "border-border bg-white"}`}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{message.role === "user" ? "Tu" : "EduCore AI"}</span>
                      {message.role === "assistant" ? (
                        <button
                          type="button"
                          onClick={() => copyMessage(message)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition hover:bg-muted"
                        >
                          <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                          {copiedId === message.id ? "Copiado" : "Copiar"}
                        </button>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{message.content}</p>
                  </div>
                </article>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                    Generando respuesta...
                  </div>
                </div>
              ) : null}
              {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            </div>

            <form
              className="border-t border-border bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <label className="sr-only" htmlFor="educore-ai-message">Mensaje para EduCore AI</label>
              <textarea
                id="educore-ai-message"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) setError(null);
                }}
                maxLength={maxMessageLength + 1}
                rows={3}
                placeholder="Escribe tu peticion..."
                className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={`text-xs ${remainingCharacters < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {remainingCharacters < 0 ? `Sobran ${Math.abs(remainingCharacters)} caracteres` : `${remainingCharacters} caracteres restantes`}
                </p>
                <button
                  type="submit"
                  disabled={loading || input.trim().length === 0 || input.trim().length > maxMessageLength}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Enviar
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
