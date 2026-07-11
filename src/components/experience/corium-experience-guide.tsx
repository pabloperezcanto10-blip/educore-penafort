"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle, Sparkles, X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { GradebookBadge } from "@/components/grades/gradebook-design";
import { experienceGuideContent } from "@/lib/experience/guide-content";
import { readExperienceStorage, writeExperienceStorage } from "@/lib/experience/demo-storage";
import type { ExperienceProfile } from "@/lib/experience/mode";

type CoriumGuideState = {
  started: boolean;
  closed: boolean;
  viewedFaqs: string[];
};

type CoriumExperienceGuideProps = {
  role: ExperienceProfile;
  open: boolean;
  onClose: () => void;
  onInterest: () => void;
};

const initialGuideState: CoriumGuideState = {
  started: false,
  closed: false,
  viewedFaqs: []
};

export function CoriumExperienceGuide({ role, open, onClose, onInterest }: CoriumExperienceGuideProps) {
  const content = experienceGuideContent[role];
  const [guideState, setGuideState] = useState<CoriumGuideState>(() => readExperienceStorage<CoriumGuideState>(role, "guide") ?? initialGuideState);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function updateGuideState(nextState: CoriumGuideState) {
    setGuideState(nextState);
    writeExperienceStorage(role, nextState, "guide");
  }

  function startGuide() {
    updateGuideState({ ...guideState, started: true, closed: false });
  }

  function closeGuide() {
    updateGuideState({ ...guideState, closed: true });
    onClose();
  }

  function toggleFaq(question: string) {
    setActiveFaq((current) => (current === question ? null : question));
    if (!guideState.viewedFaqs.includes(question)) {
      updateGuideState({ ...guideState, viewedFaqs: [...guideState.viewedFaqs, question] });
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-3 sm:items-center sm:px-4 sm:py-6" role="dialog" aria-modal="true" aria-labelledby="corium-experience-guide-title">
      <div className="flex max-h-[calc(100vh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-200 bg-white shadow-sm">
              <CoriumAvatar className="h-14 w-14 object-cover" priority />
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Guía de Corium</p>
              <h2 id="corium-experience-guide-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                {content.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{content.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeGuide}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Cerrar guía de Corium"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{content.explanation}</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      La guía es opcional: puedes probar acciones, cambiar de perfil o cerrar este panel cuando quieras.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-950">Funciones clave</h3>
                  <GradebookBadge tone={guideState.started ? "green" : "blue"}>{guideState.started ? "Guía iniciada" : "Opcional"}</GradebookBadge>
                </div>
                <div className="grid gap-2">
                  {content.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      <p className="text-sm text-slate-600">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-950">Acciones sugeridas</h3>
                <div className="grid gap-2">
                  {content.actions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => {
                        startGuide();
                        onClose();
                      }}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
                        <span className="mt-1 block text-xs text-slate-500">{action.description}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-950">Preguntas frecuentes</h3>
                <div className="space-y-2">
                  {content.faqs.slice(0, 6).map((faq) => {
                    const isOpen = activeFaq === faq.question;
                    return (
                      <div key={faq.question} className="rounded-xl border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => toggleFaq(faq.question)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-slate-950"
                          aria-expanded={isOpen}
                        >
                          <span className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                            {faq.question}
                          </span>
                          <span className="text-xs text-slate-400">{isOpen ? "Cerrar" : "Ver"}</span>
                        </button>
                        {isOpen ? <p className="border-t border-slate-200 px-3 py-2 text-sm leading-6 text-slate-600">{faq.answer}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-sm font-bold text-slate-950">Cierre del recorrido</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{content.closing}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/experience" className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                    Explorar otro perfil
                  </Link>
                  <button
                    type="button"
                    onClick={onInterest}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    Estoy interesado
                  </button>
                  <button
                    type="button"
                    onClick={closeGuide}
                    className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-white"
                  >
                    Seguir explorando
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">Corium Experience usa respuestas predefinidas. No llama a proveedores de IA.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startGuide}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800"
            >
              Empezar guía
            </button>
            <button
              type="button"
              onClick={closeGuide}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Explorar por mi cuenta
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
