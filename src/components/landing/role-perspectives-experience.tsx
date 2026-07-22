"use client";

import Link from "next/link";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import {
  rolePerspectives,
  type RolePerspective,
  type RolePerspectiveTone
} from "@/components/landing/role-perspectives-data";
import styles from "./role-perspectives.module.css";

export function RolePerspectivesExperience() {
  const [activeRoleId, setActiveRoleId] = useState<RolePerspective["id"]>(rolePerspectives[0].id);
  const activeRole = rolePerspectives.find((role) => role.id === activeRoleId) ?? rolePerspectives[0];
  const ActiveRoleIcon = activeRole.icon;

  function selectRole(role: RolePerspective) {
    setActiveRoleId(role.id);
  }

  function handleSelectorKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = rolePerspectives.findIndex((role) => role.id === activeRoleId);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % rolePerspectives.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + rolePerspectives.length) % rolePerspectives.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = rolePerspectives.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextRole = rolePerspectives[nextIndex];
    setActiveRoleId(nextRole.id);

    const selector = event.currentTarget.closest('[role="tablist"]');
    const tabs = selector?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  }

  return (
    <div className={`${styles.experience} landing-reveal landing-delay-1`}>
      <div className={styles.selectorFrame}>
        <span>Elige una perspectiva</span>
        <div className={styles.selector} role="tablist" aria-label="Perspectivas de EducaCora">
          {rolePerspectives.map((role) => {
            const Icon = role.icon;
            const selected = role.id === activeRole.id;

            return (
              <button
                key={role.id}
                id={`role-perspective-tab-${role.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="role-perspective-panel"
                tabIndex={selected ? 0 : -1}
                className={styles.selectorButton}
                data-active={selected ? "true" : "false"}
                data-accent={role.accent}
                onClick={() => selectRole(role)}
                onKeyDown={handleSelectorKeyDown}
              >
                <span className={styles.selectorIcon} aria-hidden="true"><Icon /></span>
                <span>{role.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <article
        id="role-perspective-panel"
        role="tabpanel"
        aria-labelledby={`role-perspective-tab-${activeRole.id}`}
        className={styles.surface}
        data-accent={activeRole.accent}
      >
        <div className={styles.surfaceTopbar}>
          <div className={styles.surfaceIdentity}>
            <span className={styles.surfaceIcon} aria-hidden="true"><ActiveRoleIcon /></span>
            <div>
              <small>EducaCora · {activeRole.label}</small>
              <strong>{activeRole.surfaceLabel}</strong>
            </div>
          </div>
          <div className={styles.surfaceStatus}>
            <span>Vista contextual</span>
            <span className={styles.liveStatus}><i aria-hidden="true" /> Información conectada</span>
          </div>
        </div>

        <div className={styles.transformContent} key={activeRole.id}>
          <div className={styles.productPreview}>
            <div className={styles.previewHeading}>
              <div>
                <span>{activeRole.context}</span>
                <h3>{activeRole.surfaceLabel}</h3>
              </div>
              <span className={styles.roleBadge}>{activeRole.label}</span>
            </div>

            <div className={styles.metrics} aria-label={`Indicadores de la perspectiva ${activeRole.label}`}>
              {activeRole.metrics.map((metric) => (
                <Metric key={metric.label} metric={metric} />
              ))}
            </div>

            <div className={styles.priorityPanel}>
              <div className={styles.priorityHeader}>
                <div>
                  <span>Ahora en EducaCora</span>
                  <strong>{priorityHeading(activeRole)}</strong>
                </div>
                <span>{activeRole.priorities.length} elementos</span>
              </div>
              <div className={styles.priorityList}>
                {activeRole.priorities.map((priority) => {
                  const Icon = priority.icon;
                  return (
                    <div className={styles.priorityItem} key={priority.title}>
                      <span className={styles.priorityIcon} data-tone={priority.tone} aria-hidden="true"><Icon /></span>
                      <div>
                        <strong>{priority.title}</strong>
                        <small>{priority.detail}</small>
                      </div>
                      <span className={styles.priorityState}>Disponible</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.actionStrip} aria-label={`Acciones principales de ${activeRole.label}`}>
              {activeRole.actions.map((action, index) => (
                <span key={action} data-primary={index === 0 ? "true" : "false"}>
                  {action}
                </span>
              ))}
            </div>
          </div>

          <aside className={styles.perspectiveSummary}>
            <div>
              <span className={styles.summaryKicker}>Perspectiva {activeRole.label}</span>
              <h3>{activeRole.headline}</h3>
              <p>{activeRole.description}</p>
            </div>

            <div className={styles.primaryBenefit}>
              <Sparkles aria-hidden="true" />
              <p>{activeRole.primaryBenefit}</p>
            </div>

            <ul className={styles.benefitList}>
              {activeRole.secondaryBenefits.map((benefit) => (
                <li key={benefit}><CheckCircle2 aria-hidden="true" />{benefit}</li>
              ))}
            </ul>

            <div className={styles.coriumNote}>
              <CoriumAvatar variant="waving" className={styles.coriumAvatar} />
              <p><strong>Corium AI</strong> Te mostraré la plataforma desde el perfil que elijas.</p>
            </div>

            <Link className={styles.experienceCta} href={activeRole.experienceHref}>
              Probar como {activeRole.label}
              <ArrowRight aria-hidden="true" />
            </Link>
            <small className={styles.ctaNote}>Entrarás en EducaCora Experience con datos ficticios.</small>
          </aside>
        </div>
      </article>
    </div>
  );
}

function Metric({ metric }: { metric: RolePerspective["metrics"][number] }) {
  return (
    <div className={styles.metric} data-tone={metric.tone}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
      {typeof metric.progress === "number" ? (
        <span className={styles.metricTrack} aria-hidden="true">
          <i style={{ "--metric-progress": `${metric.progress}%` } as CSSProperties} />
        </span>
      ) : null}
    </div>
  );
}

function priorityHeading(role: RolePerspective) {
  if (role.previewType === "supervision") return "Prioridades del centro";
  if (role.previewType === "daily-work") return "Tu jornada de hoy";
  return "Seguimiento de Lucía";
}
