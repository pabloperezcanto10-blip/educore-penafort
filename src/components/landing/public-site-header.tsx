import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { ContactTrigger } from "@/components/contact/contact-modal";
import { MobilePublicNav } from "@/components/landing/mobile-public-nav";
import { PUBLIC_SCHOOL_SELECTOR_PATH } from "@/lib/schools/public-schools";
import styles from "./public-site-header.module.css";

const navigationItems = [
  { label: "Qué resuelve", href: "#resuelve" },
  { label: "Módulos", href: "#modulos" },
  { label: "Roles", href: "#roles" },
  { label: "Centros", href: "#acceso" },
  { label: "Seguridad", href: "#seguridad" }
] as const;

type PublicSiteHeaderProps = {
  anchorPrefix?: "" | "/";
  showCenterAccess?: boolean;
};

export function PublicSiteHeader({
  anchorPrefix = "",
  showCenterAccess = true
}: PublicSiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="EducaCora, página principal">
          <Image
            className={styles.logo}
            src="/brand/educore/logo.svg"
            alt="EducaCora"
            width={512}
            height={150}
            priority
          />
        </Link>

        <nav className={styles.links} aria-label="Principal">
          {navigationItems.map((item) => (
            <a href={`${anchorPrefix}${item.href}`} key={item.href}>
              {item.label}
            </a>
          ))}
          <Link href="/experience">Experience</Link>
          <ContactTrigger
            origin="home_header"
            originLabel="Home — navegación"
            className={styles.contact}
          >
            <Mail aria-hidden="true" />
            Contacto
          </ContactTrigger>
        </nav>

        <div className={styles.actions}>
          {showCenterAccess ? (
            <Link
              className={`${styles.button} ${styles.softButton}`}
              href={PUBLIC_SCHOOL_SELECTOR_PATH}
            >
              Accede a tu centro
            </Link>
          ) : null}
          <Link className={`${styles.button} ${styles.primaryButton}`} href="/experience">
            Probar EducaCora
          </Link>
          <MobilePublicNav
            anchorPrefix={anchorPrefix}
            showCenterAccess={showCenterAccess}
          />
        </div>
      </div>
    </header>
  );
}
