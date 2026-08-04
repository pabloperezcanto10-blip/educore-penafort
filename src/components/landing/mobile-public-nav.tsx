"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mail, Menu, X } from "lucide-react";
import { ContactTrigger } from "@/components/contact/contact-modal";
import { PUBLIC_SCHOOL_SELECTOR_PATH } from "@/lib/schools/public-schools";
import styles from "./public-site-header.module.css";

const navigationItems = [
  { label: "Qué resuelve", href: "#resuelve" },
  { label: "Módulos", href: "#modulos" },
  { label: "Roles", href: "#roles" },
  { label: "Centros", href: "#acceso" },
  { label: "Seguridad", href: "#seguridad" }
];

type MobilePublicNavProps = {
  anchorPrefix?: "" | "/";
  showCenterAccess?: boolean;
};

export function MobilePublicNav({
  anchorPrefix = "",
  showCenterAccess = true
}: MobilePublicNavProps) {
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
    <div className={styles.mobilePublicNav}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.mobileNavTrigger}
        aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
        aria-expanded={open}
        aria-controls="public-mobile-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <button className={styles.mobileNavBackdrop} type="button" aria-label="Cerrar navegación" hidden={!open} onClick={() => closeMenu()} />
      <div ref={panelRef} className={styles.mobileNavPanel} id="public-mobile-menu" hidden={!open}>
        <div className={styles.mobileNavHeading}>Explora EducaCora</div>
        <nav aria-label="Navegación móvil">
          {navigationItems.map((item) => (
            <a className={styles.mobileNavLink} href={`${anchorPrefix}${item.href}`} key={item.href} onClick={() => closeMenu(false)}>
              {item.label}
            </a>
          ))}
          <Link className={styles.mobileNavLink} href="/experience" onClick={() => closeMenu(false)}>
            Experience
          </Link>
        </nav>
        <div className={styles.mobileNavActions}>
          <div onClickCapture={() => closeMenu(false)}>
            <ContactTrigger origin="home_header" originLabel="Home — navegación móvil" className={`${styles.mobileNavLink} ${styles.mobileNavContact}`}>
              <Mail aria-hidden="true" />
              Contacto
            </ContactTrigger>
          </div>
          {showCenterAccess ? (
            <Link className={`${styles.button} ${styles.softButton}`} href={PUBLIC_SCHOOL_SELECTOR_PATH} onClick={() => closeMenu(false)}>
              Accede a tu centro
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
