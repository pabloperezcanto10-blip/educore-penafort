"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Clipboard, Loader2, Send, X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";

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
    prompt: "Ayúdame a redactar un mensaje formal y cercano para una familia. Contexto: [describe aquí la situación]. Objetivo del mensaje: [indica qué necesitas comunicar]."
  },
  {
    label: "Mejorar observación",
    prompt: "Mejora esta observación docente para que sea clara, profesional y útil para la familia. Texto original: [pega aquí la observación]."
  },
  {
    label: "Generar recomendación de refuerzo",
    prompt: "Genera recomendaciones educativas de refuerzo para este caso. Datos aportados por el docente: [describe la dificultad o necesidad]."
  },
  {
    label: "Transformar incidencia en mensaje formal",
    prompt: "Transforma esta incidencia en un mensaje formal para la familia, sin dramatizar y con tono constructivo. Incidencia: [pega aqui el texto]."
  },
  {
    label: "Preparar actividad",
    prompt: "Ayúdame a preparar una actividad educativa. Curso: [indica curso]. Materia: [indica materia]. Objetivo: [indica objetivo]. Duración aproximada: [indica tiempo]."
  },
  {
    label: "Redactar comunicado",
    prompt: "Redacta un comunicado claro y formal para familias sobre este tema: [describe el asunto]. Debe ser breve, institucional y fácil de entender."
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
  const hasConversationContent = messages.length > 0 || input.trim().length > 0 || Boolean(error);
  const isConfigurationError = error?.toLowerCase().includes("configur") ?? false;
  const assistantStatus = loading ? "Escribiendo" : isConfigurationError ? "Configurando" : error ? "Sin conexión" : "Disponible";
  const assistantStatusTone = loading
    ? "bg-amber-100 text-amber-700"
    : isConfigurationError
      ? "bg-sky-50 text-sky-700"
      : error
        ? "bg-red-50 text-red-700"
        : "bg-emerald-50 text-emerald-700";

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed || loading) {
      return;
    }

    if (trimmed.length > maxMessageLength) {
      setError(`El mensaje es demasiado largo. Máximo ${maxMessageLength} caracteres.`);
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
        throw new Error(data.error ?? "No se pudo generar la respuesta. Inténtalo de nuevo.");
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
      setError(sendError instanceof Error ? sendError.message : "No se pudo generar la respuesta. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  function resetConversation() {
    setMessages([]);
    setInput("");
    setError(null);
    setCopiedId(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 inline-flex h-14 items-center gap-2 rounded-full border border-[#D4A64F]/40 bg-white px-3 pr-4 text-sm font-semibold text-[#0F172A] shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Abrir Corium AI"
        title="Corium AI. Tu asistente inteligente"
      >
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
          <CoriumAvatar className="h-10 w-10 object-cover" />
          <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block">Corium AI</span>
          <span className="block text-[11px] font-medium text-muted-foreground">Tu asistente inteligente</span>
        </span>
        <span className="pointer-events-none absolute bottom-full right-0 mb-2 hidden min-w-44 rounded-lg border border-border bg-white px-3 py-2 text-left text-xs text-foreground shadow-lg group-hover:block group-focus-visible:block">
          <span className="block font-semibold">Corium AI</span>
          <span className="block text-muted-foreground">Tu asistente inteligente</span>
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" role="dialog" aria-modal="true">
          <aside className="ml-auto flex h-full w-full max-w-[460px] flex-col border-l border-border bg-white shadow-2xl sm:w-[min(460px,calc(100vw-32px))]">
            <header className="flex items-start justify-between gap-4 border-b border-primary/15 bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#D4A64F]/30 bg-white shadow-sm">
                    <CoriumAvatar className="h-11 w-11 object-cover" priority />
                    <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Corium AI</h2>
                    <p className="text-xs text-muted-foreground">El corazón inteligente de EducaCora</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${assistantStatusTone}`}>{assistantStatus}</span>
                  <span className="text-xs text-muted-foreground">{role} - {userName ?? "Usuario"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white transition hover:bg-muted"
                aria-label="Cerrar asistente"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="border-b border-border bg-[#f8fafc] px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugerencias rápidas</p>
                {hasConversationContent ? (
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    Nueva conversación
                  </button>
                ) : null}
              </div>
              <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => {
                      setInput(suggestion.prompt);
                      setError(null);
                    }}
                    className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] px-5 py-4">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-white p-4 text-sm text-muted-foreground shadow-sm">
                  <p className="font-semibold text-foreground">{"\u00bfEn qu\u00e9 te ayudo?"}</p>
                  <p className="mt-2">
                    Escribe una petición o usa una sugerencia. En esta versión no se cargan datos de alumnos, notas, incidencias ni comunicaciones automáticamente.
                  </p>
                </div>
              ) : null}
              {messages.map((message) => (
                <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${message.role === "user" ? "border-primary/25 bg-primary/10 text-foreground" : "border-border bg-white text-foreground"}`}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{message.role === "user" ? "Tu" : "Corium AI"}</span>
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
              className="border-t border-border bg-white px-5 py-4 shadow-[0_-8px_18px_rgba(15,23,42,0.04)]"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <label className="sr-only" htmlFor="corium-ai-message">Mensaje para Corium AI</label>
              <textarea
                id="corium-ai-message"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) setError(null);
                }}
                maxLength={maxMessageLength + 1}
                rows={3}
                placeholder="Escribe tu petición..."
                className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-2 text-xs text-muted-foreground">La conversación solo se conserva en esta sesión y no se guarda.</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={`text-xs ${remainingCharacters < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {remainingCharacters < 0 ? `Sobran ${Math.abs(remainingCharacters)} caracteres` : `${remainingCharacters} caracteres restantes`}
                </p>
                <button
                  type="submit"
                  disabled={loading || input.trim().length === 0 || input.trim().length > maxMessageLength}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
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
