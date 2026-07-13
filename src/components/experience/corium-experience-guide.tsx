"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle, MessageCircleQuestion, Search, Sparkles, X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { GradebookBadge } from "@/components/grades/gradebook-design";
import { experienceGuideContent, findExperienceGuideAnswer } from "@/lib/experience/guide-content";
import type { GuidedTourState } from "@/lib/experience/guided-tour";
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
  onStartGuidedTour?: () => void;
  onResumeGuidedTour?: () => void;
  onRestartGuidedTour?: () => void;
  tourState?: GuidedTourState;
};

const initialGuideState: CoriumGuideState = {
  started: false,
  closed: false,
  viewedFaqs: []
};

const quickQuestions = [
  "¿Qué hace este módulo?",
  "¿Qué puedo hacer aquí?",
  "¿Cómo cambio de perfil?",
  "¿Qué datos son reales?",
  "¿Cómo funciona EducaCora?",
  "¿Cómo contactar?"
];

const unansweredMessage =
  "Esa funcionalidad todavía no está documentada en la Experience. Cuando EducaCora esté implantado en un centro, Corium AI podrá ayudarte con preguntas mucho más avanzadas.";

export function CoriumExperienceGuide({ role, open, onClose, onInterest, onStartGuidedTour, onResumeGuidedTour, onRestartGuidedTour, tourState }: CoriumExperienceGuideProps) {
  const content = experienceGuideContent[role];
  const [guideState, setGuideState] = useState<CoriumGuideState>(() => readExperienceStorage<CoriumGuideState>(role, "guide") ?? initialGuideState);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [questionBoxOpen, setQuestionBoxOpen] = useState(false);
  const [freeQuestion, setFreeQuestion] = useState("");
  const [freeAnswer, setFreeAnswer] = useState<string | null>(null);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [faqsOpen, setFaqsOpen] = useState(false);

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
    setFaqsOpen(false);
    if (onStartGuidedTour) {
      onStartGuidedTour();
      return;
    }
    setGuidedOpen(true);
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

  function answerQuestion(question: string) {
    setFaqsOpen(false);
    setGuidedOpen(false);
    setQuestionBoxOpen(true);
    setFreeQuestion(question);
    setFreeAnswer(findExperienceGuideAnswer(content, question) ?? unansweredMessage);
  }

  function handleFreeQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFreeAnswer(findExperienceGuideAnswer(content, freeQuestion) ?? unansweredMessage);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="experience-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-3 py-3 sm:items-center sm:px-4 sm:py-6" role="dialog" aria-modal="true" aria-labelledby="corium-experience-guide-title">
      <div className="experience-scale-in flex max-h-[calc(100vh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-200 bg-white shadow-sm">
              <CoriumAvatar className="h-14 w-14 object-cover" priority />
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Guía de Corium</p>
              <h2 id="corium-experience-guide-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Hola, soy Corium.
              </h2>
              <p className="mt-1 text-sm text-slate-500">Puedo ayudarte a entender este dashboard y orientarte durante la Experience.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeGuide}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    <p className="text-sm font-semibold text-slate-950">Puedo guiarte por este recorrido, responder una duda o dejarte explorar a tu ritmo.</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      No bloqueo la navegación y no llamo a proveedores externos durante la Experience.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-950">¿Qué quieres hacer?</h3>
                  <GradebookBadge tone={guideState.started ? "green" : "blue"}>{guideState.started ? "Guía iniciada" : "Opcional"}</GradebookBadge>
                </div>
                {tourState?.status === "paused" ? (
                  <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-bold">Tu recorrido quedo pausado.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={onResumeGuidedTour} className="inline-flex h-8 items-center rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">Continuar recorrido</button>
                      <button type="button" onClick={onRestartGuidedTour ?? startGuide} className="inline-flex h-8 items-center rounded-lg border border-amber-200 bg-white px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500">Reiniciar guia</button>
                    </div>
                  </div>
                ) : tourState?.status === "completed" ? (
                  <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <p className="font-bold">Ya has completado la guia de este perfil.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={onRestartGuidedTour ?? startGuide} className="inline-flex h-8 items-center rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">Repetir guia</button>
                      <Link href="/experience" className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">Explorar otro perfil</Link>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={startGuide}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    Guiarme
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuidedOpen(false);
                      setFaqsOpen(false);
                      setQuestionBoxOpen(true);
                      setFreeAnswer(null);
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                    Hacer una pregunta
                  </button>
                  <button
                    type="button"
                    onClick={closeGuide}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {guidedOpen ? (
                <div className="experience-scale-in rounded-2xl border border-emerald-100 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-950">Recorrido recomendado</h3>
                  <ol className="mt-3 space-y-2 text-sm text-slate-600">
                    {["Panel", "Comunicaciones", "Cuaderno", "Ficha del alumno", "Calendario", "Final del recorrido"].map((step, index) => (
                      <li key={step} className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">{index + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 grid gap-2">
                    {content.actions.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => onClose()}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              ) : null}

              {questionBoxOpen ? (
                <form onSubmit={handleFreeQuestionSubmit} className="experience-scale-in rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <label htmlFor="corium-free-question" className="text-sm font-bold text-slate-950">
                    Pregunta a Corium
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="corium-free-question"
                      value={freeQuestion}
                      onChange={(event) => setFreeQuestion(event.target.value)}
                      placeholder="Escribe una duda sobre la Experience"
                      className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="submit"
                      disabled={!freeQuestion.trim()}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Search className="h-4 w-4" aria-hidden="true" />
                      Buscar
                    </button>
                  </div>
                  {freeAnswer ? <p className="experience-feedback-in mt-3 rounded-xl border border-white bg-white px-3 py-2 text-sm leading-6 text-slate-600 shadow-sm">{freeAnswer}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickQuestions.slice(0, 4).map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => answerQuestion(question)}
                        className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-left text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </form>
              ) : null}

              {guidedOpen ? (
                <div className="experience-scale-in">
                  <h3 className="mb-2 text-sm font-bold text-slate-950">Funciones clave</h3>
                  <div className="grid gap-2">
                    {content.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <p className="text-sm text-slate-600">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setFaqsOpen((value) => !value);
                    setQuestionBoxOpen(false);
                    setGuidedOpen(false);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-expanded={faqsOpen}
                >
                  <HelpCircle className="h-4 w-4 text-sky-700" aria-hidden="true" />
                  {faqsOpen ? "Ocultar preguntas frecuentes" : "Consultar preguntas frecuentes"}
                </button>
                {faqsOpen ? (
                  <div className="experience-scale-in mt-3 space-y-2">
                    {content.faqs.slice(0, 8).map((faq) => {
                      const isOpen = activeFaq === faq.question;
                      return (
                        <div key={faq.question} className="rounded-xl border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => toggleFaq(faq.question)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                ) : null}
              </div>

              {guidedOpen ? <div className="experience-scale-in rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-sm font-bold text-slate-950">Cierre del recorrido</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{content.closing}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/experience" className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    Explorar otro perfil
                  </Link>
                  <button
                    type="button"
                    onClick={onInterest}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    Estoy interesado
                  </button>
                  <button
                    type="button"
                    onClick={onInterest}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    Contactar
                  </button>
                  <button
                    type="button"
                    onClick={closeGuide}
                    className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    Seguir explorando
                  </button>
                </div>
              </div> : null}
            </section>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">Corium Experience usa respuestas predefinidas. No llama a proveedores de IA.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startGuide}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Empezar guía
            </button>
            <button
              type="button"
              onClick={closeGuide}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Explorar por mi cuenta
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}


