"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpenCheck, Check, MessageSquareText, Users } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import styles from "./living-hero.module.css";

const demoSteps = [
  {
    role: "Docente",
    title: "Actualización registrada",
    detail: "Lucía Romero · Matemáticas",
    status: "Enviada",
    Icon: BookOpenCheck
  },
  {
    role: "Dirección",
    title: "Seguimiento actualizado",
    detail: "6.º de Primaria · Vista resumida",
    status: "Revisado",
    Icon: Users
  },
  {
    role: "Familias",
    title: "Comunicación disponible",
    detail: "18 de 22 familias informadas",
    status: "Visible",
    Icon: MessageSquareText
  }
] as const;

const progressClasses = [styles.progressOne, styles.progressTwo, styles.progressThree];

export function HeroProductDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timers: number[] = [];

    function clearTimers() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    }

    function runDemo() {
      clearTimers();

      if (motionPreference.matches) {
        setStage(2);
        return;
      }

      setStage(0);
      timers = [
        window.setTimeout(() => setStage(1), 2200),
        window.setTimeout(() => setStage(2), 4600)
      ];
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimers();
      } else {
        runDemo();
      }
    }

    runDemo();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionPreference.addEventListener("change", runDemo);

    return () => {
      clearTimers();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionPreference.removeEventListener("change", runDemo);
    };
  }, []);

  return (
    <div className={styles.productDemo}>
      <p className={styles.visuallyHidden}>
        EducaCora conecta una actualización docente con la supervisión de Dirección y la comunicación visible para las familias.
      </p>

      <div className={styles.productFrame} aria-hidden="true">
        <div className={styles.productHeader}>
          <div className={styles.productBrand}>
            <Image src="/brand/educore/icon.svg" alt="" width={30} height={28} />
            <div>
              <strong>Colegio EducaCora</strong>
              <span>Centro de control</span>
            </div>
          </div>
          <span className={styles.centerStatus}><span /> Centro conectado</span>
        </div>

        <div className={styles.roleStrip}>
          {demoSteps.map((step, index) => (
            <span className={`${styles.roleChip}${stage === index ? ` ${styles.roleChipActive}` : ""}`} key={step.role}>
              {step.role}
            </span>
          ))}
          <span className={styles.syncLabel}>Sincronización activa</span>
        </div>

        <div className={styles.productBody}>
          <div className={styles.metricRow}>
            <div className={styles.metric}>
              <span>Asistencia</span>
              <strong>96%</strong>
              <div className={styles.metricTrack}><i className={styles.metricAttendance} /></div>
            </div>
            <div className={styles.metric}>
              <span>Progreso trimestral</span>
              <strong>78%</strong>
              <div className={styles.metricTrack}><i className={styles.metricProgress} /></div>
            </div>
            <div className={styles.metric}>
              <span>Familias informadas</span>
              <strong>18/22</strong>
              <div className={styles.metricTrack}><i className={styles.metricFamilies} /></div>
            </div>
          </div>

          <div className={styles.workspace}>
            <div className={styles.flowPanel}>
              <div className={styles.flowHeading}>
                <div>
                  <span>Flujo del centro</span>
                  <strong>Una actualización, todos conectados</strong>
                </div>
                <span className={styles.liveBadge}>En curso</span>
              </div>

              <div className={styles.flowProgress}>
                <i className={progressClasses[stage]} />
              </div>

              <div className={styles.flowList}>
                {demoSteps.map((step, index) => {
                  const isComplete = index < stage;
                  const isActive = index === stage;
                  const StepIcon = step.Icon;

                  return (
                    <div
                      className={`${styles.flowItem}${isActive ? ` ${styles.flowItemActive}` : ""}${isComplete ? ` ${styles.flowItemComplete}` : ""}`}
                      key={step.role}
                    >
                      <span className={styles.flowIcon}>{isComplete ? <Check /> : <StepIcon />}</span>
                      <span className={styles.flowCopy}>
                        <small>{step.role}</small>
                        <strong>{step.title}</strong>
                        <span>{step.detail}</span>
                      </span>
                      <span className={styles.flowStatus}>{step.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className={styles.sceneAside}>
              <div className={styles.agendaHeading}>
                <span>Ahora en el centro</span>
                <strong>Actividad coordinada</strong>
              </div>
              <div className={styles.agendaItem}>
                <span className={styles.agendaTime}>09:30</span>
                <span><strong>Asistencia registrada</strong><small>6.º de Primaria</small></span>
              </div>
              <div className={styles.agendaItem}>
                <span className={styles.agendaTime}>10:15</span>
                <span><strong>Evaluación actualizada</strong><small>Matemáticas</small></span>
              </div>
            </aside>
            <div className={styles.coriumMoment}>
              <CoriumAvatar variant="avatar" className={styles.heroCorium} priority />
              <span><strong>Corium AI</strong><small>Dirección, docentes y familias en un mismo espacio.</small></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
