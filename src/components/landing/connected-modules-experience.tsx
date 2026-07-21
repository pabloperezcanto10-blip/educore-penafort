"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  GraduationCap,
  MessageSquareText,
  Share2
} from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import {
  connectedModules,
  type ConnectedModuleIcon,
  type ConnectedModuleId
} from "@/components/landing/connected-modules-data";
import styles from "./connected-modules.module.css";

const iconByModule: Record<ConnectedModuleIcon, LucideIcon> = {
  attendance: ClipboardCheck,
  gradebook: BookOpenCheck,
  communications: MessageSquareText,
  students: GraduationCap,
  calendar: CalendarDays,
  supervision: BarChart3
};

const progressClasses = [styles.demoProgressOne, styles.demoProgressTwo, styles.demoProgressThree];

export function ConnectedModulesExperience() {
  const [activeModuleId, setActiveModuleId] = useState<ConnectedModuleId>("attendance");
  const [demoStage, setDemoStage] = useState(0);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const experienceRef = useRef<HTMLDivElement>(null);
  const activeModule = useMemo(
    () => connectedModules.find((module) => module.id === activeModuleId) ?? connectedModules[0],
    [activeModuleId]
  );

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncMotionPreference() {
      setReducedMotion(motionPreference.matches);
    }

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);
    return () => motionPreference.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    const element = experienceRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting && entry.intersectionRatio >= 0.18),
      { threshold: [0, 0.18, 0.45] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const animated = activeModule.demoType !== "static";

    if (reducedMotion || !animated) {
      setDemoStage(2);
      return;
    }

    if (!sectionVisible) return;

    setDemoStage(0);
    const secondStage = window.setTimeout(() => setDemoStage(1), 1800);
    const finalStage = window.setTimeout(() => setDemoStage(2), 3600);

    return () => {
      window.clearTimeout(secondStage);
      window.clearTimeout(finalStage);
    };
  }, [activeModule, reducedMotion, sectionVisible]);

  function selectModule(moduleId: ConnectedModuleId) {
    const selectedModule = connectedModules.find((module) => module.id === moduleId);
    const isAnimated = selectedModule?.demoType !== "static";
    setDemoStage(reducedMotion || !isAnimated ? 2 : 0);
    setActiveModuleId(moduleId);
  }

  function handleSelectorKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = connectedModules.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex === null) return;

    event.preventDefault();
    selectModule(connectedModules[nextIndex].id);
    const selector = event.currentTarget.closest('[role="tablist"]');
    const tabs = selector?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  }

  const ActiveIcon = iconByModule[activeModule.icon];

  return (
    <div ref={experienceRef} className={`${styles.ecosystem} landing-reveal landing-delay-1`}>
      <div className={styles.selectorColumn}>
        <div className={styles.selectorHeading}>
          <span>Explora el ecosistema</span>
          <strong>Una sola fuente de información</strong>
        </div>

        <div className={styles.moduleSelector} role="tablist" aria-label="Módulos conectados" aria-orientation="vertical">
          {connectedModules.map((module, index) => {
            const Icon = iconByModule[module.icon];
            const active = module.id === activeModule.id;

            return (
              <button
                key={module.id}
                id={`module-tab-${module.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="connected-module-panel"
                tabIndex={active ? 0 : -1}
                className={styles.moduleTab}
                data-active={active ? "true" : "false"}
                data-accent={module.accent}
                onClick={() => selectModule(module.id)}
                onKeyDown={(event) => handleSelectorKeyDown(event, index)}
              >
                <span className={styles.moduleTabIcon}><Icon aria-hidden="true" /></span>
                <span className={styles.moduleTabCopy}>
                  <strong>{module.shortTitle}</strong>
                  <small>{module.relatedRoles.join(" · ")}</small>
                </span>
                <ArrowRight className={styles.moduleTabArrow} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className={styles.coriumNote}>
          <CoriumAvatar variant="avatar" className={styles.coriumAvatar} />
          <span>
            <strong>Corium AI</strong>
            <small>Una acción, la información adecuada para cada perfil.</small>
          </span>
        </div>
      </div>

      <div
        id="connected-module-panel"
        role="tabpanel"
        aria-labelledby={`module-tab-${activeModule.id}`}
        className={styles.productPanel}
        data-accent={activeModule.accent}
      >
        <div className={styles.panelHeader}>
          <div className={styles.panelIdentity}>
            <span className={styles.panelIcon}><ActiveIcon aria-hidden="true" /></span>
            <div>
              <span className={styles.panelKicker}>Módulo conectado</span>
              <h3>{activeModule.title}</h3>
            </div>
          </div>
          <div className={styles.roleBadges} aria-label={`Perfiles conectados: ${activeModule.relatedRoles.join(", ")}`}>
            {activeModule.relatedRoles.map((role) => <span key={role}>{role}</span>)}
          </div>
        </div>

        <div className={styles.panelIntro}>
          <p>{activeModule.description}</p>
          <span className={styles.connectedBadge}><Share2 aria-hidden="true" /> Información compartida</span>
        </div>

        <div className={styles.productSurface} key={activeModule.id} aria-hidden="true">
          <div className={styles.contextCard}>
            <div className={styles.contextCopy}>
              <span>{activeModule.context.eyebrow}</span>
              <strong>{activeModule.context.title}</strong>
              <small>{activeModule.context.detail}</small>
            </div>
            <div className={styles.metricBlock}>
              <span>{activeModule.metric.label}</span>
              <strong>{activeModule.metric.value}</strong>
              <div className={styles.metricTrack}>
                <i style={{ width: `${activeModule.metric.progress}%` }} />
              </div>
            </div>
          </div>

          <div className={styles.flowHeader}>
            <div>
              <span>Flujo conectado</span>
              <strong>La información avanza con su contexto</strong>
            </div>
            <span className={styles.flowState}>{demoStage === 2 ? "Conectado" : "Actualizando"}</span>
          </div>

          <div className={styles.demoProgress}>
            <i className={progressClasses[demoStage]} />
          </div>

          <ol className={styles.flowSteps}>
            {activeModule.steps.map((step, index) => {
              const complete = index < demoStage;
              const active = index === demoStage;

              return (
                <li
                  key={`${activeModule.id}-${step.role}`}
                  className={styles.flowStep}
                  data-active={active ? "true" : "false"}
                  data-complete={complete ? "true" : "false"}
                >
                  <span className={styles.stepMarker}>{complete ? <Check aria-hidden="true" /> : index + 1}</span>
                  <span className={styles.stepCopy}>
                    <small>{step.role}</small>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </span>
                  <span className={styles.stepStatus}>{step.status}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className={styles.accessibleSummary}>
          {activeModule.benefit} Flujo: {activeModule.steps.map((step) => `${step.role}, ${step.title}`).join("; ")}.
        </p>

        <div className={styles.panelFooter}>
          <p>{activeModule.benefit}</p>
          <Link href="/experience" className={styles.experienceLink}>
            Probar estos módulos <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
