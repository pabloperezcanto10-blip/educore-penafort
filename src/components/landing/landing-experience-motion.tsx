"use client";

import { useEffect, useState } from "react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";

const defaultMessage = "Bienvenido a EducaCora.";

export function LandingExperienceMotion() {
  const [message, setMessage] = useState(defaultMessage);

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

  return (
    <aside className="contextual-corium" aria-live="polite" aria-label="Mensaje contextual de Corium">
      <CoriumAvatar className="contextual-corium-avatar" />
      <span>{message}</span>
    </aside>
  );
}
