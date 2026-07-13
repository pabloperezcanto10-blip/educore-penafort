"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, Mail, Pause, Play, RotateCcw, X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { GradebookBadge } from "@/components/grades/gradebook-design";
import { experienceRoles, type ExperienceRole } from "@/components/experience/experience-data";
import type { GuidedTourState, GuidedTourStep } from "@/lib/experience/guided-tour";

type GuidedTourOverlayProps = {
  role: ExperienceRole;
  state: GuidedTourState;
  steps: GuidedTourStep[];
  currentStep: GuidedTourStep | null;
  targetMissing: boolean;
  announcement: string;
  onPrevious: () => void;
  onNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onExit: () => void;
  onExplore: () => void;
  onRestart: () => void;
  onContact: () => void;
  onSwitchRole: (role: ExperienceRole, href: string) => void;
};

const roleLabel: Record<ExperienceRole, string> = {
  director: "Direccion",
  docente: "Docente",
  familia: "Familia"
};

export function GuidedTourOverlay({
  role,
  state,
  steps,
  currentStep,
  targetMissing,
  announcement,
  onPrevious,
  onNext,
  onPause,
  onResume,
  onExit,
  onExplore,
  onRestart,
  onContact,
  onSwitchRole
}: GuidedTourOverlayProps) {
  if (state.status === "idle" || state.status === "exited") {
    return null;
  }

  const totalSteps = steps.length;
  const currentNumber = Math.min(state.stepIndex + 1, totalSteps);
  const isFirstStep = state.stepIndex <= 0;
  const isLastStep = state.stepIndex >= totalSteps - 1;

  return (
    <>
      <span className="sr-only" aria-live="polite">{announcement}</span>
      <section
        className="experience-tour-panel experience-fade-up fixed inset-x-3 bottom-3 z-[55] rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-slate-900/14 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px]"
        style={{ marginBottom: "env(safe-area-inset-bottom)", marginRight: "env(safe-area-inset-right)", marginLeft: "env(safe-area-inset-left)" }}
        role="region"
        aria-label="Recorrido guiado de Corium"
      >
        {state.status === "completed" ? (
          <CompletedTour
            role={role}
            onExplore={onExplore}
            onRestart={onRestart}
            onContact={onContact}
            onSwitchRole={onSwitchRole}
          />
        ) : state.status === "paused" ? (
          <PausedTour currentStep={currentStep} onResume={onResume} onExplore={onExplore} onRestart={onRestart} />
        ) : currentStep ? (
          <ActiveTour
            step={currentStep}
            currentNumber={currentNumber}
            totalSteps={totalSteps}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            targetMissing={targetMissing}
            onPrevious={onPrevious}
            onNext={onNext}
            onPause={onPause}
            onExit={onExit}
            onExplore={onExplore}
          />
        ) : null}
      </section>
    </>
  );
}

function TourHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border border-amber-200 bg-white shadow-sm">
        <CoriumAvatar className="h-12 w-12 object-cover" priority />
        <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">Corium te acompana sin usar IA real en la Experience.</p>
      </div>
    </div>
  );
}

function ActiveTour({
  step,
  currentNumber,
  totalSteps,
  isFirstStep,
  isLastStep,
  targetMissing,
  onPrevious,
  onNext,
  onPause,
  onExit,
  onExplore
}: {
  step: GuidedTourStep;
  currentNumber: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  targetMissing: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPause: () => void;
  onExit: () => void;
  onExplore: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <TourHeader eyebrow={`Paso ${currentNumber} de ${totalSteps}`} />
        <button type="button" onClick={onExit} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Salir del recorrido guiado">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-950">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Ventaja</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{step.benefit}</p>
        </div>
        {targetMissing ? (
          <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Esta funcion esta abierta. Puedes seguir con el recorrido.
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onPrevious} disabled={isFirstStep} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Anterior
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPause} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            Pausar
          </button>
          <button type="button" onClick={onExplore} className="inline-flex h-9 items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
            Explorar por mi cuenta
          </button>
          <button type="button" onClick={onNext} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {isLastStep ? "Finalizar guia" : "Siguiente"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PausedTour({ currentStep, onResume, onExplore, onRestart }: { currentStep: GuidedTourStep | null; onResume: () => void; onExplore: () => void; onRestart: () => void }) {
  return (
    <div>
      <TourHeader eyebrow="Recorrido pausado" />
      <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-950">Tu guia quedo pausada{currentStep ? ` en ${currentStep.title}` : ""}.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Puedes continuar desde este punto o seguir explorando la Experience a tu ritmo.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onResume} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Continuar recorrido
        </button>
        <button type="button" onClick={onExplore} className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          Continuar explorando
        </button>
        <button type="button" onClick={onRestart} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reiniciar guia
        </button>
      </div>
    </div>
  );
}

function CompletedTour({ role, onExplore, onRestart, onContact, onSwitchRole }: { role: ExperienceRole; onExplore: () => void; onRestart: () => void; onContact: () => void; onSwitchRole: (role: ExperienceRole, href: string) => void }) {
  return (
    <div>
      <TourHeader eyebrow="Guia completada" />
      <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-950">Has completado la guia del perfil {roleLabel[role]}.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Ahora puedes explorar con libertad, probar otro perfil o contactar para ver EducaCora aplicado a tu centro.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onExplore} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <Compass className="h-4 w-4" aria-hidden="true" />
          Explorar por mi cuenta
        </button>
        <button type="button" onClick={onContact} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Contactar
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {experienceRoles.map((profile) => (
          <button key={profile.id} type="button" onClick={() => onSwitchRole(profile.id, profile.href)} disabled={profile.id === role} className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:bg-amber-50 disabled:text-amber-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {profile.id === role ? roleLabel[profile.id] : `Probar ${roleLabel[profile.id]}`}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onRestart} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Repetir guia
        </button>
        <Link href="/" className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          Volver a la web
        </Link>
      </div>
    </div>
  );
}
