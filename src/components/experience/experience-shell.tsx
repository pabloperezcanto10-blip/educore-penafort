"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircleQuestion, RotateCcw, X } from "lucide-react";
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

export function ExperienceShell({ brand, role, onReset, startGuide = false, children }: ExperienceShellProps) {
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(startGuide);

  useEffect(() => {
    if (!interestOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setInterestOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [interestOpen]);

  function showContactPending() {
    setInterestMessage("Canal de contacto disponible próximamente.");
  }

  function openInterest() {
    setInterestMessage(null);
    setInterestOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white/92 px-4 py-5 shadow-sm lg:sticky lg:top-0 lg:h-screen">
          <Link href="/" className="inline-flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50">
            <Image src={brand.assets.logo} alt={brand.productName} width={512} height={150} className="h-auto w-44" priority />
          </Link>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-3">
              <CoriumAvatar className="h-12 w-12 rounded-full object-cover" priority />
              <div>
                <p className="text-sm font-bold text-slate-950">Experience activa</p>
                <p className="text-xs font-medium text-emerald-700">{brand.name} · datos ficticios</p>
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
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
                <Link
                  key={profile.id}
                  href={profile.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    profile.id === role ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {profile.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restablecer Experience
          </button>

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            Guía de Corium
          </button>

          <button
            type="button"
            onClick={openInterest}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Estoy interesado
          </button>
        </aside>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>

      <CoriumExperienceGuide
        role={role}
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onInterest={() => {
          setGuideOpen(false);
          openInterest();
        }}
      />

      {interestOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="experience-interest-title">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
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
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Contactar
              </button>
              <button
                type="button"
                onClick={showContactPending}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Solicitar una reunión
              </button>
              <button
                type="button"
                onClick={() => setInterestOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                Seguir explorando
              </button>
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
