import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { AiProviderError, callSelectedAiProvider, type AiChatMessage } from "@/lib/ai/providers";

const allowedRoles = new Set(["tutor", "director", "superadmin"]);
const maxMessageLength = 2000;

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active || profile.must_change_password) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!allowedRoles.has(profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (process.env.AI_ASSISTANT_ENABLED !== "true") {
    return NextResponse.json({ error: "El asistente IA no esta activado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    message?: unknown;
    route?: unknown;
    history?: IncomingMessage[];
  } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const route = typeof body?.route === "string" ? body.route.slice(0, 180) : "ruta no indicada";
  const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];

  if (!message) {
    return NextResponse.json({ error: "Escribe una peticion para el asistente." }, { status: 400 });
  }

  if (message.length > maxMessageLength) {
    return NextResponse.json({ error: `El mensaje es demasiado largo. Maximo ${maxMessageLength} caracteres.` }, { status: 400 });
  }

  const messages: AiChatMessage[] = [
    {
      role: "system",
      content: [
        "Eres Corium AI, un copiloto educativo para personal interno de un centro escolar.",
        "Responde siempre en espanol, con tono profesional, claro y educativo.",
        "Ayudas a redactar mensajes formales a familias, mejorar observaciones docentes, resumir textos aportados por el usuario, preparar tutorias, redactar comunicados internos y generar recomendaciones educativas.",
        "No inventes datos de alumnos, familias, notas, asistencia, incidencias ni comunicaciones. Si faltan datos, pide al usuario que los aporte.",
        "No des consejos medicos, legales o psicologicos sensibles. No sustituyas decisiones del docente ni de direccion.",
        "En esta fase no tienes acceso automatico a datos internos: usa solo el texto que el usuario escriba y el contexto minimo de rol/ruta."
      ].join("\n")
    },
    {
      role: "user",
      content: `Contexto de uso: rol=${profile.role}; ruta=${route}.`
    },
    ...history
      .filter((item) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) })),
    {
      role: "user",
      content: message
    }
  ];

  try {
    const { reply, model, provider } = await callSelectedAiProvider(messages);

    await logAuditAction({
      actorUserId: profile.id,
      actorRole: profile.role,
      action: "ai_assistant_used",
      module: "ai_assistant",
      entityType: "ai_request",
      afterData: {
        route,
        provider,
        model
      }
    });

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "No se pudo generar la respuesta. Intentalo de nuevo." }, { status: 500 });
  }
}
