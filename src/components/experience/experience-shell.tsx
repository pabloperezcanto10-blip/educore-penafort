"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Compass, Mail, MessageCircleQuestion, RotateCcw, X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { CoriumExperienceGuide } from "@/components/experience/corium-experience-guide";
import { experienceNavigation, experienceRoles, type ExperienceRole } from "@/components/experience/experience-data";
import type { BrandConfig } from "@/lib/branding/brand-config";

type ExperienceShellProps = {
  brand: BrandConfig;
  role: ExperienceRole;
  onReset: () => void;
  startGuide?: boolean;
  children: ReactNode;
};

const transitionCopy: Record<ExperienceRole, string> = {
  director: "Ahora descubrirás EducaCora desde la perspectiva de Dirección.",
  docente: "Ahora verás cómo trabaja un docente en su día a día.",
  familia: "Ahora conocerás la experiencia de las familias."
};

export function ExperienceShell({ brand, role, onReset, startGuide = false, children }: ExperienceShellProps) {
  const router = useRouter();
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(startGuide);
  const [finalOpen, setFinalOpen] = useState(false);
  const [transitionRole, setTransitionRole] = useState<ExperienceRole | null>(null);

  useEffect(() => {
    if (!interestOpen && !finalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (interestOpen) {
          setInterestOpen(false);
          return;
        }
        setFinalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interestOpen, finalOpen]);

  function showContactPending() {
    setInterestMessage("Canal de contacto disponible próximamente.");
  }

  function openInterest() {
    setFinalOpen(false);
    setInterestMessage(null);
    setInterestOpen(true);
  }

  function handleRoleSwitch(nextRole: ExperienceRole, href: string) {
    if (nextRole === role) return;

    setTransitionRole(nextRole);
    window.setTimeout(() => {
      router.push(`${href}?guide=1`);
    }, 520);
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="experience-fade-in border-r border-slate-200 bg-white/92 px-4 py-5 shadow-sm lg:sticky lg:top-0 lg:h-screen">
          <Link href="/" className="inline-flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <Image src={brand.assets.logo} alt={brand.productName} width={512} height={150} className="h-auto w-44" priority />
          </Link>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-3">
              <CoriumAvatar className="h-12 w-12 rounded-full object-cover" priority />
              <div>
                <p className="text-sm font-bold text-slate-950">EducaCora Experience</p>
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  Demo interactiva · {brand.name}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Navegación Experience">
            {experienceNavigation.map((item, index) => {
              const Icon = item.icon;
              const href = getExperienceNavigationHref(role, item.id);
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    index === 0 ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Explorar otro perfil</p>
            <div className="mt-2 space-y-1">
              {experienceRoles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleRoleSwitch(profile.id, profile.href)}
                  disabled={profile.id === role}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    profile.id === role ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {profile.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restablecer Experience
          </button>

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Guía de Corium
          </button>

          <button
            type="button"
            onClick={() => setFinalOpen(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            Finalizar recorrido
          </button>

          <button
            type="button"
            onClick={openInterest}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Estoy interesado
          </button>
        </aside>

        <main className="experience-fade-up px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>

      <button
        type="button"
        onClick={() => setGuideOpen(true)}
        className="experience-corium-glow fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-3 rounded-full border border-emerald-100 bg-white px-3 py-2 pr-4 text-sm font-bold text-slate-950 shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:bottom-5 sm:right-5"
        style={{ marginBottom: "env(safe-area-inset-bottom)", marginRight: "env(safe-area-inset-right)" }}
        aria-label="Abrir guía de Corium"
      >
        <span className="relative flex h-9 w-9 overflow-hidden rounded-full border border-amber-200 bg-white">
          <CoriumAvatar className="h-9 w-9 object-cover" />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">Corium</span>
      </button>

      <CoriumExperienceGuide
        role={role}
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onInterest={() => {
          setGuideOpen(false);
          openInterest();
        }}
      />

      {finalOpen ? (
        <div className="experience-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="experience-final-title">
          <div className="experience-scale-in w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CoriumAvatar className="h-14 w-14 rounded-full border border-amber-200 bg-white object-cover shadow-sm" priority />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Corium</p>
                  <h2 id="experience-final-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                    ¿Qué te ha parecido EducaCora?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFinalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Cerrar panel final"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Ya has conocido cómo funciona EducaCora desde la perspectiva de este perfil.</p>
              <p>Puedes seguir descubriendo la plataforma desde otros roles o contactar con nosotros si quieres conocer cómo se adaptaría EducaCora a vuestro centro.</p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {experienceRoles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleRoleSwitch(profile.id, profile.href)}
                  disabled={profile.id === role}
                  className="group flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:bg-amber-50 disabled:text-amber-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {profile.id === "director" ? "Explorar Dirección" : profile.id === "docente" ? "Explorar Docente" : "Explorar Familias"}
                  {profile.id === role ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />}
                </button>
              ))}
            </div>

            <div className="my-5 h-px bg-slate-200" />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={openInterest}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Estoy interesado
                </button>
                <button
                  type="button"
                  onClick={openInterest}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Contactar
                </button>
              </div>
              <Link href="/" className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                Volver a la web
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {interestOpen ? (
        <div className="experience-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="experience-interest-title">
          <div className="experience-scale-in w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">EducaCora Experience</p>
                <h2 id="experience-interest-title" className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                  ¿Te interesa EducaCora para tu centro?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInterestOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Podemos enseñarte cómo se adaptaría EducaCora a la organización y necesidades de tu centro educativo.
            </p>
            {interestMessage ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                {interestMessage}
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={showContactPending}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Contactar
              </button>
              <button
                type="button"
                onClick={showContactPending}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Solicitar una reunión
              </button>
              <button
                type="button"
                onClick={() => setInterestOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {transitionRole ? (
        <div className="experience-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-[#f6f3ec]/88 px-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="experience-scale-in flex w-full max-w-md items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <CoriumAvatar className="h-16 w-16 rounded-full border border-amber-200 bg-white object-cover" priority />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Cambiando de perfil</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{transitionCopy[transitionRole]}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getExperienceNavigationHref(role: ExperienceRole, itemId: string) {
  if (itemId === "panel") {
    return `/experience/${role}`;
  }

  if (itemId === "corium") {
    return `/experience/${role}?demo=corium`;
  }

  if (role === "director") {
    const tabByItem: Record<string, string> = {
      communications: "comunicaciones",
      students: "alumnos",
      gradebook: "evaluacion",
      attendance: "alumnos",
      calendar: "calendario"
    };
    const tab = tabByItem[itemId] ?? "prioridades";
    return `/experience/director?work_tab=${tab}&demo=${itemId}`;
  }

  if (role === "docente") {
    const tabByItem: Record<string, string> = {
      communications: "comunicaciones",
      students: "alumnos",
      gradebook: "cuaderno",
      attendance: "pendientes",
      calendar: "calendario"
    };
    const tab = tabByItem[itemId] ?? "pendientes";
    return `/experience/docente?work_tab=${tab}&demo=${itemId}`;
  }

  return `/experience/familia?demo=${itemId}`;
}
