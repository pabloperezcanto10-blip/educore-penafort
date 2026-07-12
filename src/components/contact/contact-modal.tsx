"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/site-config";

type ContactContext = {
  origin: string;
  originLabel?: string;
  experienceRole?: "director" | "docente" | "familia";
  progress?: {
    explored: number;
    total: number;
    visited: string[];
  };
};

type ContactModalProps = ContactContext & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ContactTriggerProps = ContactContext & {
  children: ReactNode;
  className?: string;
};

type ContactFormState = {
  fullName: string;
  email: string;
  schoolName: string;
  role: string;
  otherRole: string;
  phone: string;
  location: string;
  message: string;
  privacyAccepted: boolean;
  website: string;
};

type ContactErrors = Partial<Record<keyof ContactFormState | "turnstile", string>>;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme?: "light" | "dark" | "auto";
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    gtag?: (...args: unknown[]) => void;
  }
}

const roleOptions = ["Dirección", "Docente", "Administración", "Orientación", "Responsable TIC", "Titularidad", "Familia", "Otro"];
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const initialState: ContactFormState = {
  fullName: "",
  email: "",
  schoolName: "",
  role: "",
  otherRole: "",
  phone: "",
  location: "",
  message: "",
  privacyAccepted: false,
  website: ""
};

export function ContactTrigger({ children, className, ...context }: ContactTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <ContactModal open={open} onOpenChange={setOpen} {...context} />
    </>
  );
}

export function ContactModal({ open, onOpenChange, origin, originLabel, experienceRole, progress }: ContactModalProps) {
  const [form, setForm] = useState<ContactFormState>(initialState);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [serverError, setServerError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const sourceUrl = typeof window !== "undefined" ? window.location.href : "";

  const contextText = useMemo(() => {
    if (!experienceRole) return null;
    const labels = {
      director: "Dirección",
      docente: "Docente",
      familia: "Familia"
    };
    return `Estás contactando después de explorar el perfil ${labels[experienceRole]}.`;
  }, [experienceRole]);

  useEffect(() => {
    if (!open) return;

    window.gtag?.("event", "contact_form_opened", {
      origin,
      experience_role: experienceRole ?? "none"
    });

    const frame = window.requestAnimationFrame(() => firstFieldRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && status !== "submitting") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [experienceRole, onOpenChange, open, origin, status]);

  useEffect(() => {
    if (!open || !turnstileSiteKey || !turnstileRef.current) return;

    let cancelled = false;
    const siteKey = turnstileSiteKey;

    function renderTurnstile() {
      if (cancelled || !turnstileRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => {
          setTurnstileToken(token);
          setErrors((current) => ({ ...current, turnstile: undefined }));
        },
        "expired-callback": () => {
          setTurnstileToken("");
          setErrors((current) => ({ ...current, turnstile: "La verificación ha caducado. Inténtalo de nuevo." }));
        },
        "error-callback": () => {
          setTurnstileToken("");
          setErrors((current) => ({ ...current, turnstile: "No hemos podido verificar el envío. Inténtalo de nuevo." }));
        }
      });
    }

    if (window.turnstile) {
      renderTurnstile();
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-turnstile='educacora-contact']");
    const script = existingScript ?? document.createElement("script");
    if (!existingScript) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "educacora-contact";
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderTurnstile);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderTurnstile);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  function update<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const nextErrors: ContactErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (form.fullName.trim().length < 3) nextErrors.fullName = "Indica tu nombre y apellidos.";
    if (!emailPattern.test(form.email.trim())) nextErrors.email = "Indica un correo electrónico válido.";
    if (form.schoolName.trim().length < 2) nextErrors.schoolName = "Indica el centro educativo.";
    if (!roleOptions.includes(form.role)) nextErrors.role = "Selecciona tu cargo o relación con el centro.";
    if (form.role === "Otro" && form.otherRole.trim().length < 2) nextErrors.otherRole = "Especifica tu relación con el centro.";
    if (form.phone.trim().length > 40) nextErrors.phone = "El teléfono es demasiado largo.";
    if (form.location.trim().length > 100) nextErrors.location = "La localidad o provincia es demasiado larga.";
    if (form.message.trim().length > 1200) nextErrors.message = "El mensaje no puede superar 1200 caracteres.";
    if (!form.privacyAccepted) nextErrors.privacyAccepted = "Debes aceptar la Política de Privacidad.";
    if (!turnstileToken) nextErrors.turnstile = "Completa la verificación de seguridad.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (status === "submitting") return;
    if (!validate()) return;

    setStatus("submitting");
    setServerError("");
    window.gtag?.("event", "contact_form_submitted", { origin, experience_role: experienceRole ?? "none" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          turnstileToken,
          origin,
          originLabel,
          experienceRole,
          progress,
          sourceUrl
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo enviar la solicitud.");
      }

      setStatus("success");
      setForm(initialState);
      setTurnstileToken("");
      window.gtag?.("event", "contact_form_success", { origin, experience_role: experienceRole ?? "none" });
    } catch (error) {
      setStatus("error");
      setServerError(error instanceof Error ? error.message : "Ahora mismo no hemos podido enviar tu solicitud.");
      window.turnstile?.reset(widgetIdRef.current ?? undefined);
      setTurnstileToken("");
      window.gtag?.("event", "contact_form_error", { origin, experience_role: experienceRole ?? "none" });
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-3 py-5" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Contacto EducaCora</p>
            <h2 id="contact-modal-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {status === "success" ? "Solicitud enviada" : "Hablemos de tu centro"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {status === "success"
                ? "Gracias por tu interés en EducaCora. Hemos recibido tu solicitud y te responderemos lo antes posible."
                : "Déjanos tus datos y nos pondremos en contacto contigo."}
            </p>
            {contextText && status !== "success" ? <p className="mt-2 text-xs font-semibold text-emerald-700">{contextText}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={status === "submitting"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            aria-label="Cerrar formulario de contacto"
          >
            ×
          </button>
        </header>

        {status === "success" ? (
          <div className="space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status" aria-live="polite">
              Solicitud enviada correctamente.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => onOpenChange(false)} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                Seguir explorando
              </button>
              <Link href="/" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                Volver a la web
              </Link>
            </div>
          </div>
        ) : (
          <form
            className="overflow-y-auto px-4 py-5 sm:px-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellidos" error={errors.fullName} required>
                <input ref={firstFieldRef} value={form.fullName} onChange={(event) => update("fullName", event.target.value)} autoComplete="name" className={inputClass(errors.fullName)} />
              </Field>
              <Field label="Correo electrónico" error={errors.email} required>
                <input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" autoComplete="email" inputMode="email" className={inputClass(errors.email)} />
              </Field>
              <Field label="Centro educativo" error={errors.schoolName} required>
                <input value={form.schoolName} onChange={(event) => update("schoolName", event.target.value)} autoComplete="organization" className={inputClass(errors.schoolName)} />
              </Field>
              <Field label="Cargo o relación con el centro" error={errors.role} required>
                <select value={form.role} onChange={(event) => update("role", event.target.value)} className={inputClass(errors.role)}>
                  <option value="">Selecciona una opción</option>
                  {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              {form.role === "Otro" ? (
                <Field label="Especifica tu relación" error={errors.otherRole} required>
                  <input value={form.otherRole} onChange={(event) => update("otherRole", event.target.value)} className={inputClass(errors.otherRole)} />
                </Field>
              ) : null}
              <Field label="Teléfono" error={errors.phone}>
                <input value={form.phone} onChange={(event) => update("phone", event.target.value)} type="tel" autoComplete="tel" inputMode="tel" className={inputClass(errors.phone)} />
              </Field>
              <Field label="Localidad o provincia" error={errors.location}>
                <input value={form.location} onChange={(event) => update("location", event.target.value)} autoComplete="address-level2" className={inputClass(errors.location)} />
              </Field>
              <Field label="Mensaje" error={errors.message} className="sm:col-span-2">
                <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={4} className={`${inputClass(errors.message)} min-h-28 resize-y py-3`} />
              </Field>
            </div>

            <div className="hidden" aria-hidden="true">
              <label>
                Web
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} />
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <input type="checkbox" checked={form.privacyAccepted} onChange={(event) => update("privacyAccepted", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500" />
              <span>
                He leído y acepto la <Link href="/politica-privacidad" className="font-semibold text-emerald-700 underline-offset-4 hover:underline" target="_blank">Política de Privacidad</Link>. Usaremos tus datos únicamente para responder a tu solicitud.
                {errors.privacyAccepted ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors.privacyAccepted}</span> : null}
              </span>
            </label>

            <div className="mt-4">
              {turnstileSiteKey ? <div ref={turnstileRef} /> : <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">La verificación de seguridad no está configurada en este entorno.</div>}
              {errors.turnstile ? <p className="mt-2 text-xs font-semibold text-red-600">{errors.turnstile}</p> : null}
            </div>

            {status === "error" ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {serverError || "Ahora mismo no hemos podido enviar tu solicitud."} Puedes intentarlo de nuevo o escribirnos a{" "}
                <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="font-semibold underline underline-offset-4">{PUBLIC_CONTACT_EMAIL}</a>.
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="text-sm font-semibold text-slate-500 underline-offset-4 hover:underline">
                {PUBLIC_CONTACT_EMAIL}
              </a>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => onOpenChange(false)} disabled={status === "submitting"} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={status === "submitting"} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {status === "submitting" ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, required, className, children }: { label: string; error?: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-semibold text-slate-700">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </span>
      <span className="mt-1 block">{children}</span>
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-emerald-400 focus:ring-emerald-100"
  }`;
}
