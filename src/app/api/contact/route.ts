import { NextResponse } from "next/server";

const allowedRoles = ["Dirección", "Docente", "Administración", "Orientación", "Responsable TIC", "Titularidad", "Familia", "Otro"] as const;
const allowedExperienceRoles = ["director", "docente", "familia"] as const;

type ContactPayload = {
  fullName?: unknown;
  email?: unknown;
  schoolName?: unknown;
  role?: unknown;
  otherRole?: unknown;
  phone?: unknown;
  location?: unknown;
  message?: unknown;
  privacyAccepted?: unknown;
  website?: unknown;
  turnstileToken?: unknown;
  origin?: unknown;
  originLabel?: unknown;
  experienceRole?: unknown;
  sourceUrl?: unknown;
  progress?: unknown;
};

type SanitizedPayload = {
  fullName: string;
  email: string;
  schoolName: string;
  role: string;
  otherRole: string;
  phone: string;
  location: string;
  message: string;
  turnstileToken: string;
  origin: string;
  originLabel: string;
  experienceRole: string;
  sourceUrl: string;
  progress: {
    explored: number;
    total: number;
    visited: string[];
  } | null;
};

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonError("Solicitud no válida.", 415);
  }

  const rawBody = await request.text();
  if (rawBody.length > 12_000) {
    return jsonError("La solicitud es demasiado larga.", 413);
  }

  let payload: ContactPayload;
  try {
    payload = JSON.parse(rawBody) as ContactPayload;
  } catch {
    return jsonError("Solicitud no válida.", 400);
  }

  if (sanitizeString(payload.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const validation = sanitizePayload(payload);
  if ("error" in validation) {
    return jsonError(validation.error, 400);
  }

  const config = getContactConfig();
  if ("error" in config) {
    return jsonError(config.error, 500);
  }

  const turnstileValid = await verifyTurnstile(validation.turnstileToken, config.turnstileSecret, request);
  if (!turnstileValid) {
    return jsonError("No hemos podido verificar el envío. Inténtalo de nuevo.", 400);
  }

  const emailResponse = await sendContactEmail(validation, config);
  if (!emailResponse.ok) {
    console.error("Contact email delivery failed", { status: emailResponse.status });
    return jsonError("Ahora mismo no hemos podido enviar tu solicitud.", 500);
  }

  return NextResponse.json({ ok: true });
}

function sanitizePayload(payload: ContactPayload): SanitizedPayload | { error: string } {
  const fullName = sanitizeString(payload.fullName, 120);
  const email = sanitizeString(payload.email, 180).toLowerCase();
  const schoolName = sanitizeString(payload.schoolName, 160);
  const role = sanitizeString(payload.role, 80);
  const otherRole = sanitizeString(payload.otherRole, 80);
  const phone = sanitizeString(payload.phone, 40);
  const location = sanitizeString(payload.location, 100);
  const message = sanitizeString(payload.message, 1200);
  const turnstileToken = sanitizeString(payload.turnstileToken, 4096);
  const origin = sanitizeString(payload.origin, 80);
  const originLabel = sanitizeString(payload.originLabel, 120);
  const sourceUrl = sanitizeString(payload.sourceUrl, 500);
  const experienceRole = sanitizeString(payload.experienceRole, 30);

  if (fullName.length < 3) return { error: "Indica tu nombre y apellidos." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indica un correo electrónico válido." };
  if (schoolName.length < 2) return { error: "Indica el centro educativo." };
  if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) return { error: "Selecciona tu cargo o relación con el centro." };
  if (role === "Otro" && otherRole.length < 2) return { error: "Especifica tu relación con el centro." };
  if (payload.privacyAccepted !== true) return { error: "Debes aceptar la Política de Privacidad." };
  if (!turnstileToken) return { error: "Completa la verificación de seguridad." };
  if (experienceRole && !allowedExperienceRoles.includes(experienceRole as (typeof allowedExperienceRoles)[number])) return { error: "Contexto de Experience no válido." };

  return {
    fullName,
    email,
    schoolName,
    role,
    otherRole,
    phone,
    location,
    message,
    turnstileToken,
    origin: origin || "unknown",
    originLabel,
    experienceRole,
    sourceUrl,
    progress: sanitizeProgress(payload.progress)
  };
}

function sanitizeProgress(value: unknown): SanitizedPayload["progress"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const explored = clampNumber(record.explored, 0, 50);
  const total = clampNumber(record.total, 0, 50);
  const visited = Array.isArray(record.visited)
    ? record.visited.slice(0, 12).map((item) => sanitizeString(item, 60)).filter(Boolean)
    : [];

  return { explored, total, visited };
}

function getContactConfig():
  | {
      resendApiKey: string;
      contactToEmail: string;
      contactFromEmail: string;
      turnstileSecret: string;
    }
  | { error: string } {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const contactToEmail = process.env.CONTACT_TO_EMAIL?.trim();
  const contactFromEmail = process.env.CONTACT_FROM_EMAIL?.trim();
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!resendApiKey || !contactToEmail || !contactFromEmail || !turnstileSecret) {
    return { error: "El formulario todavía no está configurado." };
  }

  return { resendApiKey, contactToEmail, contactFromEmail, turnstileSecret };
}

async function verifyTurnstile(token: string, secret: string, request: Request) {
  const params = new URLSearchParams({
    secret,
    response: token
  });
  const ip = getClientIp(request);
  if (ip) params.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;
    return Boolean(response.ok && payload?.success);
  } catch {
    return false;
  }
}

async function sendContactEmail(
  payload: SanitizedPayload,
  config: {
    resendApiKey: string;
    contactToEmail: string;
    contactFromEmail: string;
  }
) {
  const subject = `Nueva solicitud desde EducaCora - ${payload.schoolName}`;
  const html = buildHtmlEmail(payload);
  const text = buildTextEmail(payload);

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.contactFromEmail,
      to: [config.contactToEmail],
      reply_to: payload.email,
      subject,
      html,
      text
    })
  });
}

function buildHtmlEmail(payload: SanitizedPayload) {
  const rows = [
    ["Nombre", payload.fullName],
    ["Email", payload.email],
    ["Centro", payload.schoolName],
    ["Cargo", payload.role === "Otro" ? payload.otherRole : payload.role],
    ["Teléfono", payload.phone || "No indicado"],
    ["Localidad", payload.location || "No indicada"],
    ["Origen", payload.originLabel || payload.origin],
    ["Rol explorado", payload.experienceRole || "No aplica"],
    ["Progreso Experience", payload.progress ? `${payload.progress.explored}/${payload.progress.total} módulos (${payload.progress.visited.join(", ") || "sin módulos"})` : "No aplica"],
    ["URL", payload.sourceUrl || "No indicada"],
    ["Fecha", new Date().toISOString()]
  ];

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 12px">Nueva solicitud desde EducaCora</h1>
      <p style="margin:0 0 18px;color:#475569">Un visitante ha enviado el formulario de contacto comercial.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <th style="border:1px solid #e2e8f0;background:#f8fafc;padding:10px;text-align:left;width:180px">${escapeHtml(label)}</th>
                  <td style="border:1px solid #e2e8f0;padding:10px">${escapeHtml(value)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      <h2 style="font-size:16px;margin:20px 0 8px">Mensaje</h2>
      <p style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc">${escapeHtml(payload.message || "Sin mensaje adicional.")}</p>
    </div>
  `;
}

function buildTextEmail(payload: SanitizedPayload) {
  return [
    "Nueva solicitud desde EducaCora",
    "",
    `Nombre: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Centro: ${payload.schoolName}`,
    `Cargo: ${payload.role === "Otro" ? payload.otherRole : payload.role}`,
    `Teléfono: ${payload.phone || "No indicado"}`,
    `Localidad: ${payload.location || "No indicada"}`,
    `Origen: ${payload.originLabel || payload.origin}`,
    `Rol explorado: ${payload.experienceRole || "No aplica"}`,
    `Progreso Experience: ${payload.progress ? `${payload.progress.explored}/${payload.progress.total} módulos (${payload.progress.visited.join(", ") || "sin módulos"})` : "No aplica"}`,
    `URL: ${payload.sourceUrl || "No indicada"}`,
    `Fecha: ${new Date().toISOString()}`,
    "",
    "Mensaje:",
    payload.message || "Sin mensaje adicional."
  ].join("\n");
}

function sanitizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function clampNumber(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
