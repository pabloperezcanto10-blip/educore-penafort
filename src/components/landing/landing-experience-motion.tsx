"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";

const defaultMessage = "Bienvenido a EducaCora.";

export function LandingExperienceMotion() {
  const [message, setMessage] = useState(defaultMessage);
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [containedCoriumVisible, setContainedCoriumVisible] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");

    function syncLayout() {
      setCompact(mediaQuery.matches);
      setExpanded(!mediaQuery.matches);
    }

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    const containedScenes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-hero-corium-scene], [data-corium-contained-scene]")
    );

    if (containedScenes.length === 0) {
      setContainedCoriumVisible(false);
      return;
    }

    const visibleScenes = new Set<Element>();
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
            visibleScenes.add(entry.target);
          } else {
            visibleScenes.delete(entry.target);
          }
        });
        setContainedCoriumVisible(visibleScenes.size > 0);
      },
      { threshold: [0, 0.12, 0.35] }
    );

    containedScenes.forEach((scene) => sceneObserver.observe(scene));
    return () => sceneObserver.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".landing-reveal"));
    const messageSections = Array.from(document.querySelectorAll<HTMLElement>("[data-corium-message]"));

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    const messageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          setMessage(visible.target.dataset.coriumMessage ?? defaultMessage);
        }
      },
      { rootMargin: "-24% 0px -48% 0px", threshold: [0.18, 0.34, 0.5] }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
    messageSections.forEach((section) => messageObserver.observe(section));

    return () => {
      revealObserver.disconnect();
      messageObserver.disconnect();
    };
  }, []);

  if (containedCoriumVisible) return null;

  return (
    <aside className={`contextual-corium${expanded ? " is-expanded" : ""}`} aria-label="Ayuda contextual de Corium">
      <button
        type="button"
        className="contextual-corium-toggle"
        aria-label={compact ? (expanded ? "Contraer ayuda de Corium" : "Abrir ayuda de Corium") : "Corium AI"}
        aria-expanded={compact ? expanded : undefined}
        disabled={!compact}
        onClick={() => setExpanded((current) => !current)}
      >
        <CoriumAvatar className="contextual-corium-avatar" priority />
      </button>
      <span className="contextual-corium-message" aria-live={expanded ? "polite" : "off"} aria-atomic="true">
        {message}
      </span>
      {compact && expanded ? (
        <button type="button" className="contextual-corium-close" aria-label="Contraer ayuda de Corium" onClick={() => setExpanded(false)}>
          <X aria-hidden="true" />
        </button>
      ) : null}
    </aside>
  );
}
