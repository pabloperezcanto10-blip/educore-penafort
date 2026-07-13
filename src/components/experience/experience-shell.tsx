"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Compass, Mail, Menu, MessageCircleQuestion, RotateCcw, X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { ContactModal } from "@/components/contact/contact-modal";
import { CoriumExperienceGuide } from "@/components/experience/corium-experience-guide";
import { GuidedTourOverlay } from "@/components/experience/guided-tour-overlay";
import {
  experienceRoles,
  getActiveExperienceModuleKey,
  getExperienceModule,
  getExperienceModuleHref,
  getExperienceModules,
  getProgressExperienceModules,
  type ExperienceModuleKey,
  type ExperienceRole
} from "@/components/experience/experience-data";
import type { BrandConfig } from "@/lib/branding/brand-config";
import { readExperienceStorage, writeExperienceStorage } from "@/lib/experience/demo-storage";
import { createGuidedTourState, getGuidedTourSteps, normalizeGuidedTourState, type GuidedTourState, type GuidedTourStatus } from "@/lib/experience/guided-tour";

type ExperienceShellProps = {
  brand: BrandConfig;
  role: ExperienceRole;
  onReset: () => void;
  startGuide?: boolean;
  children: ReactNode;
};

type ExperienceProgressState = {
  visited: ExperienceModuleKey[];
};

const transitionCopy: Record<ExperienceRole, string> = {
  director: "Ahora descubrirÃ¡s EducaCora desde la perspectiva de DirecciÃ³n.",
  docente: "Ahora verÃ¡s cÃ³mo trabaja un docente en su dÃ­a a dÃ­a.",
  familia: "Ahora conocerÃ¡s la experiencia de las familias."
};

export function ExperienceShell({ brand, role, onReset, startGuide = false, children }: ExperienceShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mainRef = useRef<HTMLElement | null>(null);
  const moduleTitleRef = useRef<HTMLHeadingElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactOriginLabel, setContactOriginLabel] = useState("EducaCora Experience");
  const [guideOpen, setGuideOpen] = useState(startGuide);
  const [finalOpen, setFinalOpen] = useState(false);
  const [transitionRole, setTransitionRole] = useState<ExperienceRole | null>(null);
  const [navigationFeedback, setNavigationFeedback] = useState<string | null>(null);
  const [highlightedModule, setHighlightedModule] = useState<ExperienceModuleKey | null>(null);
  const [tourTargetMissing, setTourTargetMissing] = useState(false);
  const [tourAnnouncement, setTourAnnouncement] = useState("");
  const [tourState, setTourState] = useState<GuidedTourState>(() => normalizeGuidedTourState(role, readExperienceStorage<GuidedTourState>(role, "tour")));
  const [progress, setProgress] = useState<ExperienceProgressState>(() => readExperienceStorage<ExperienceProgressState>(role, "progress") ?? { visited: [] });
  const activeModule = getActiveExperienceModuleKey(role, searchParams.get("demo"));
  const activeModuleConfig = getExperienceModule(role, activeModule);
  const roleModules = useMemo(() => getExperienceModules(role), [role]);
  const progressModules = useMemo(() => getProgressExperienceModules(role), [role]);
  const guidedTourSteps = useMemo(() => getGuidedTourSteps(role), [role]);
  const currentTourStep = tourState.status === "active" || tourState.status === "paused" ? guidedTourSteps[tourState.stepIndex] ?? null : tourState.status === "completed" ? guidedTourSteps[Math.max(0, guidedTourSteps.length - 1)] ?? null : null;
  const tourOverlayVisible = tourState.status === "active" || tourState.status === "paused" || tourState.status === "completed";
  const exploredCount = progress.visited.filter((item) => progressModules.some((module) => module.key === item)).length;

  const markProgressModule = useCallback((moduleKey: ExperienceModuleKey) => {
    const moduleConfig = getExperienceModule(role, moduleKey);
    if (!moduleConfig.progress) return;

    setProgress((current) => {
      if (current.visited.includes(moduleKey)) {
        return current;
      }

      const next = { visited: [...current.visited, moduleKey] };
      writeExperienceStorage(role, next, "progress");
      return next;
    });
  }, [role]);

  function persistTourState(nextState: GuidedTourState) {
    setTourState(nextState);
    writeExperienceStorage(role, nextState, "tour");
  }

  const trackGuidedTourEvent = useCallback((eventName: string, extra?: Record<string, string | number | boolean | undefined>) => {
    if (typeof window === "undefined") return;
    (window as Window & { gtag?: (command: "event", eventName: string, params?: Record<string, unknown>) => void }).gtag?.("event", eventName, { experience_role: role, ...extra });
  }, [role]);

  useEffect(() => {
    setProgress(readExperienceStorage<ExperienceProgressState>(role, "progress") ?? { visited: [] });
    setTourState(normalizeGuidedTourState(role, readExperienceStorage<GuidedTourState>(role, "tour")));
    setTourTargetMissing(false);
  }, [role]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeModule, role]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => drawerRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")
      ).filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!finalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFinalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finalOpen]);

  useEffect(() => {
    if (activeModule === "corium") {
      setGuideOpen(true);
      return;
    }

    markProgressModule(activeModule);
  }, [activeModule, markProgressModule]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetId = activeModule === "panel" ? "experience-main-start" : "experience-demo-panel";
    const title = activeModule === "panel" ? "Panel" : activeModuleConfig.title;
    let highlightedTarget: HTMLElement | null = null;
    let animationFrame = 0;
    let highlightTimer: number | null = null;
    let feedbackTimer: number | null = null;

    animationFrame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;

      setNavigationFeedback(activeModule === "panel" ? "Volviendo al panel." : `${title} abierto.`);
      setHighlightedModule(activeModule);
      highlightedTarget = target;
      highlightedTarget.classList.remove("experience-target-highlight");
      void highlightedTarget.offsetWidth;
      highlightedTarget.classList.add("experience-target-highlight");
      highlightedTarget.style.scrollMarginTop = window.innerWidth < 1280 ? "96px" : "16px";
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });

      if (activeModule !== "panel") {
        moduleTitleRef.current?.focus({ preventScroll: true });
      } else {
        mainRef.current?.focus({ preventScroll: true });
      }

      highlightTimer = window.setTimeout(() => setHighlightedModule(null), reducedMotion ? 700 : 1400);
      feedbackTimer = window.setTimeout(() => setNavigationFeedback(null), 1800);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      highlightedTarget?.classList.remove("experience-target-highlight");
      if (highlightTimer !== null) window.clearTimeout(highlightTimer);
      if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
    };
  }, [activeModule, activeModuleConfig.title]);


  useEffect(() => {
    if (tourState.status !== "active" || !currentTourStep) {
      return;
    }

    const step = currentTourStep;

    if (activeModule !== step.module) {
      router.push(getExperienceModuleHref(role, step.module));
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetSelector = `[data-experience-target="${step.target}"]`;
    let cancelled = false;
    let highlightedTarget: HTMLElement | null = null;
    let timeoutId: number | null = null;
    let observer: MutationObserver | null = null;

    function findTarget() {
      return document.querySelector<HTMLElement>(targetSelector)
        ?? document.getElementById(step.target)
        ?? document.getElementById(activeModule === "panel" ? "experience-main-start" : "experience-demo-panel")
        ?? mainRef.current;
    }

    function activateTarget(target: HTMLElement, missing: boolean) {
      if (cancelled) return;
      setTourTargetMissing(missing);
      setTourAnnouncement(`Paso ${tourState.stepIndex + 1} de ${guidedTourSteps.length}. ${step.title}.`);
      markProgressModule(step.completionKey ?? step.module);
      trackGuidedTourEvent("guided_tour_step_viewed", { step_id: step.id, step_index: tourState.stepIndex + 1 });

      highlightedTarget = target;
      highlightedTarget.classList.remove("experience-guided-tour-highlight");
      void highlightedTarget.offsetWidth;
      highlightedTarget.classList.add("experience-guided-tour-highlight");
      highlightedTarget.style.scrollMarginTop = window.innerWidth < 1280 ? "112px" : "24px";
      highlightedTarget.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start", inline: "nearest" });
    }

    const immediateTarget = findTarget();
    if (immediateTarget) {
      activateTarget(immediateTarget, !immediateTarget.matches(targetSelector));
    } else {
      observer = new MutationObserver(() => {
        const target = findTarget();
        if (target) {
          observer?.disconnect();
          activateTarget(target, !target.matches(targetSelector));
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      timeoutId = window.setTimeout(() => {
        observer?.disconnect();
        const fallbackTarget = document.getElementById(activeModule === "panel" ? "experience-main-start" : "experience-demo-panel") ?? mainRef.current;
        if (fallbackTarget) {
          activateTarget(fallbackTarget, true);
        }
      }, 900);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      highlightedTarget?.classList.remove("experience-guided-tour-highlight");
    };
  }, [activeModule, currentTourStep, guidedTourSteps.length, markProgressModule, role, router, tourState.status, tourState.stepIndex, trackGuidedTourEvent]);

  useEffect(() => {
    if (tourState.status !== "active") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const step = guidedTourSteps[tourState.stepIndex] ?? guidedTourSteps[0];
      if (!step) return;
      const nextState: GuidedTourState = {
        ...tourState,
        status: "paused",
        stepId: step.id,
        paused: true,
        startedAt: tourState.startedAt ?? new Date().toISOString()
      };
      setTourState(nextState);
      writeExperienceStorage(role, nextState, "tour");
      setTourAnnouncement("Recorrido pausado. Puedes retomarlo desde Corium.");
      trackGuidedTourEvent("guided_tour_paused", { step_index: tourState.stepIndex + 1 });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guidedTourSteps, role, tourState, trackGuidedTourEvent]);

  function startGuidedTour(stepIndex = 0) {
    const step = guidedTourSteps[stepIndex] ?? guidedTourSteps[0];
    if (!step) return;

    const nextState = createGuidedTourState(role, "active", stepIndex);
    persistTourState(nextState);
    setGuideOpen(false);
    setFinalOpen(false);
    setMobileMenuOpen(false);
    setTourTargetMissing(false);
    trackGuidedTourEvent("guided_tour_started", { step_id: step.id });
    router.push(getExperienceModuleHref(role, step.module));
  }

  function updateGuidedTourStatus(status: GuidedTourStatus, stepIndex = tourState.stepIndex) {
    const step = guidedTourSteps[stepIndex] ?? guidedTourSteps[0];
    if (!step) return;

    const nextState: GuidedTourState = {
      ...tourState,
      role,
      status,
      stepIndex,
      stepId: step.id,
      completed: status === "completed" || tourState.completed,
      paused: status === "paused",
      startedAt: tourState.startedAt ?? new Date().toISOString()
    };
    persistTourState(nextState);
  }

  function pauseGuidedTour() {
    if (tourState.status !== "active") return;
    updateGuidedTourStatus("paused");
    setTourAnnouncement("Recorrido pausado. Puedes retomarlo desde Corium.");
    trackGuidedTourEvent("guided_tour_paused", { step_index: tourState.stepIndex + 1 });
  }

  function resumeGuidedTour() {
    const step = guidedTourSteps[tourState.stepIndex] ?? guidedTourSteps[0];
    if (!step) return;
    updateGuidedTourStatus("active");
    setGuideOpen(false);
    setMobileMenuOpen(false);
    trackGuidedTourEvent("guided_tour_resumed", { step_index: tourState.stepIndex + 1 });
    router.push(getExperienceModuleHref(role, step.module));
  }

  function exitGuidedTour(status: GuidedTourStatus = "exited") {
    if (tourState.status === "idle") return;
    updateGuidedTourStatus(status);
    setTourTargetMissing(false);
    setTourAnnouncement(status === "completed" ? "Recorrido completado." : "Recorrido finalizado.");
    trackGuidedTourEvent(status === "completed" ? "guided_tour_completed" : "guided_tour_exited", { step_index: tourState.stepIndex + 1 });
  }

  function exploreWithoutGuide() {
    exitGuidedTour("exited");
  }

  function goToGuidedTourStep(stepIndex: number) {
    const safeIndex = Math.max(0, Math.min(stepIndex, guidedTourSteps.length - 1));
    const step = guidedTourSteps[safeIndex];
    if (!step) return;

    const nextState: GuidedTourState = {
      ...tourState,
      role,
      status: "active",
      stepIndex: safeIndex,
      stepId: step.id,
      paused: false,
      startedAt: tourState.startedAt ?? new Date().toISOString()
    };
    persistTourState(nextState);
    setTourTargetMissing(false);
    router.push(getExperienceModuleHref(role, step.module));
  }

  function nextGuidedTourStep() {
    if (tourState.stepIndex >= guidedTourSteps.length - 1) {
      exitGuidedTour("completed");
      return;
    }
    goToGuidedTourStep(tourState.stepIndex + 1);
  }

  function previousGuidedTourStep() {
    goToGuidedTourStep(tourState.stepIndex - 1);
  }

  function handleManualNavigation() {
    if (tourState.status === "active") {
      pauseGuidedTour();
    }
  }
  function openContact(originLabel: string) {
    setMobileMenuOpen(false);
    setContactOriginLabel(originLabel);
    setContactOpen(true);
  }

  function handleRoleSwitch(nextRole: ExperienceRole, href: string) {
    if (nextRole === role) return;
    if (tourState.status === "active" || tourState.status === "paused") {
      exitGuidedTour("exited");
      trackGuidedTourEvent("guided_tour_role_changed", { target_role: nextRole });
    }

    setTransitionRole(nextRole);
    window.setTimeout(() => {
      router.push(`${href}?guide=1`);
    }, 520);
  }

  return (
    <div className="min-h-dvh bg-[#f6f3ec] text-slate-950">
      <div className="grid min-h-dvh xl:grid-cols-[280px_1fr]">
        <aside className="experience-fade-in hidden flex-col border-r border-slate-200 bg-white/92 shadow-sm xl:sticky xl:top-0 xl:flex xl:h-screen xl:max-h-screen xl:overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
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
                    Demo interactiva Â· {brand.name}
                  </p>
                </div>
              </div>
            </div>

            <nav className="mt-5 space-y-1" aria-label="Navegacion Experience">
              {roleModules.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.key;
                const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`;

                if (item.key === "corium") {
                  return (
                    <button key={item.key} type="button" onClick={() => { handleManualNavigation(); setGuideOpen(true); }} className={className} aria-current={isActive ? "page" : undefined}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                }

                return (
                  <Link key={item.key} href={getExperienceModuleHref(role, item.key)} onClick={handleManualNavigation} className={className} aria-current={isActive ? "page" : undefined}>
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
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-4">
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Recorrido</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{exploredCount} de {progressModules.length} funciones exploradas</p>
            </div>

            <button
              type="button"
              onClick={() => { exitGuidedTour("exited"); setFinalOpen(true); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Finalizar recorrido
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                Corium
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reiniciar
              </button>
            </div>
            <button
              type="button"
              onClick={() => openContact("Estoy interesado")}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Estoy interesado
            </button>
          </div>
        </aside>

        <main id="experience-main-start" data-experience-target="dashboard-summary" ref={mainRef} tabIndex={-1} className="experience-fade-up px-4 pb-5 pt-3 outline-none sm:px-6 xl:px-8 xl:py-5">
          <header className="sticky top-0 z-30 -mx-4 mb-3 border-b border-slate-200 bg-[#f6f3ec]/95 px-4 py-2 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 xl:hidden" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
            <div className="flex min-h-12 items-center justify-between gap-2">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Abrir menu de Experience"
                aria-expanded={mobileMenuOpen}
                aria-controls="experience-mobile-drawer"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                Menu
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-sm font-bold text-slate-950">EducaCora Experience</p>
                <p className="truncate text-xs font-semibold text-emerald-700">
                  {experienceRoles.find((item) => item.id === role)?.label ?? "Perfil"} - {exploredCount}/{progressModules.length} exploradas
                </p>
              </div>
              <button
                type="button"
                onClick={() => { exitGuidedTour("exited"); setFinalOpen(true); }}
                className="inline-flex h-10 items-center justify-center rounded-full border border-amber-200 bg-white px-3 text-xs font-bold text-amber-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                Finalizar
              </button>
            </div>
          </header>

          {mobileMenuOpen ? (
            <div className="fixed inset-0 z-50 xl:hidden" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/45"
                aria-label="Cerrar menu"
                onClick={() => {
                  setMobileMenuOpen(false);
                  menuButtonRef.current?.focus();
                }}
              />
              <div
                id="experience-mobile-drawer"
                ref={drawerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Menu de EducaCora Experience"
                className="experience-scale-in fixed left-0 top-0 flex h-dvh w-[min(88vw,360px)] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl outline-none"
                style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
                  <div className="min-w-0">
                    <Image src={brand.assets.logo} alt={brand.productName} width={512} height={150} className="h-auto w-40" priority />
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Recorrido {exploredCount}/{progressModules.length}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    aria-label="Cerrar menu"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <nav className="space-y-1" aria-label="Navegacion movil Experience">
                    {roleModules.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.key;
                      const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`;

                      if (item.key === "corium") {
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => { handleManualNavigation(); setMobileMenuOpen(false); setGuideOpen(true); }}
                            className={className}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {item.label}
                          </button>
                        );
                      }

                      return (
                        <Link key={item.key} href={getExperienceModuleHref(role, item.key)} onClick={() => { handleManualNavigation(); setMobileMenuOpen(false); }} className={className} aria-current={isActive ? "page" : undefined}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-5 border-t border-slate-200 pt-4">
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

                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Acciones</p>
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Reiniciar recorrido
                      </button>
                      <button
                        type="button"
                        onClick={() => openContact("Contactar")}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Contactar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {navigationFeedback ? (
            <div className="experience-feedback-in sticky top-3 z-30 mb-3 w-fit rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm" role="status" aria-live="polite">
              {navigationFeedback}
            </div>
          ) : (
            <span className="sr-only" aria-live="polite">{activeModuleConfig.title} abierto.</span>
          )}
          {activeModule !== "panel" ? (
            <h2 ref={moduleTitleRef} tabIndex={-1} className="sr-only">
              {activeModuleConfig.title} abierto.
            </h2>
          ) : null}
          <div className={highlightedModule === "panel" ? "experience-target-highlight rounded-3xl" : undefined}>
            {children}
          </div>
        </main>
      </div>

      {!tourOverlayVisible ? (
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="experience-corium-glow fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-3 rounded-full border border-emerald-100 bg-white px-3 py-2 pr-4 text-sm font-bold text-slate-950 shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:bottom-5 sm:right-5"
          style={{ marginBottom: "env(safe-area-inset-bottom)", marginRight: "env(safe-area-inset-right)" }}
          aria-label="Abrir guia de Corium"
        >
          <span className="relative flex h-9 w-9 overflow-hidden rounded-full border border-amber-200 bg-white">
            <CoriumAvatar className="h-9 w-9 object-cover" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Corium</span>
        </button>
      ) : null}

      <CoriumExperienceGuide
        role={role}
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onInterest={() => {
          setGuideOpen(false);
          openContact("Corium");
        }}
        onStartGuidedTour={() => startGuidedTour()}
        onResumeGuidedTour={resumeGuidedTour}
        onRestartGuidedTour={() => startGuidedTour()}
        tourState={tourState}
      />

      <GuidedTourOverlay
        role={role}
        state={tourState}
        steps={guidedTourSteps}
        currentStep={currentTourStep}
        targetMissing={tourTargetMissing}
        announcement={tourAnnouncement}
        onPrevious={previousGuidedTourStep}
        onNext={nextGuidedTourStep}
        onPause={pauseGuidedTour}
        onResume={resumeGuidedTour}
        onExit={() => exitGuidedTour("exited")}
        onExplore={exploreWithoutGuide}
        onRestart={() => startGuidedTour()}
        onContact={() => {
          exitGuidedTour("exited");
          trackGuidedTourEvent("guided_tour_contact_opened");
          openContact("Tour guiado Corium");
        }}
        onSwitchRole={handleRoleSwitch}
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
                    Â¿QuÃ© te ha parecido EducaCora?
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
              <p>Ya has conocido cÃ³mo funciona EducaCora desde la perspectiva de este perfil.</p>
              <p>Puedes seguir descubriendo la plataforma desde otros roles o contactar con nosotros si quieres conocer cÃ³mo se adaptarÃ­a EducaCora a vuestro centro.</p>
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
                  {profile.id === "director" ? "Explorar DirecciÃ³n" : profile.id === "docente" ? "Explorar Docente" : "Explorar Familias"}
                  {profile.id === role ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />}
                </button>
              ))}
            </div>

            <div className="my-5 h-px bg-slate-200" />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openContact("Estoy interesado")}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Estoy interesado
                </button>
                <button
                  type="button"
                  onClick={() => openContact("Contactar")}
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

      <ContactModal
        open={contactOpen}
        onOpenChange={setContactOpen}
        origin="experience"
        originLabel={contactOriginLabel}
        experienceRole={role}
        progress={{
          explored: exploredCount,
          total: progressModules.length,
          visited: progress.visited
        }}
      />

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









