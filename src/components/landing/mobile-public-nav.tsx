"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, Menu, X } from "lucide-react";
import { ContactTrigger } from "@/components/contact/contact-modal";

const navigationItems = [
  { label: "Qué resuelve", href: "#resuelve" },
  { label: "Módulos", href: "#modulos" },
  { label: "Roles", href: "#roles" },
  { label: "Centros", href: "#acceso" },
  { label: "Seguridad", href: "#seguridad" }
];

export function MobilePublicNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const firstControl = panelRef.current?.querySelector<HTMLElement>("a, button");
    firstControl?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu, open]);

  return (
    <div className="mobile-public-nav">
      <button
        ref={triggerRef}
        type="button"
        className="mobile-nav-trigger"
        aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
        aria-expanded={open}
        aria-controls="public-mobile-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <button className="mobile-nav-backdrop" type="button" aria-label="Cerrar navegación" hidden={!open} onClick={() => closeMenu()} />
      <div ref={panelRef} className="mobile-nav-panel" id="public-mobile-menu" hidden={!open}>
        <div className="mobile-nav-heading">Explora EducaCora</div>
        <nav aria-label="Navegación móvil">
          {navigationItems.map((item) => (
            <a className="mobile-nav-link" href={item.href} key={item.href} onClick={() => closeMenu(false)}>
              {item.label}
            </a>
          ))}
          <Link className="mobile-nav-link" href="/experience" onClick={() => closeMenu(false)}>
            Experience
          </Link>
        </nav>
        <div className="mobile-nav-actions">
          <div onClickCapture={() => closeMenu(false)}>
            <ContactTrigger origin="home_header" originLabel="Home — navegación móvil" className="mobile-nav-link mobile-nav-contact">
              <Mail aria-hidden="true" />
              Contacto
            </ContactTrigger>
          </div>
          <a className="btn btn-soft" href="#acceso" onClick={() => closeMenu(false)}>
            Accede a tu centro
          </a>
        </div>
      </div>
    </div>
  );
}
