import Image from "next/image";
import Link from "next/link";
import { ContactTrigger } from "@/components/contact/contact-modal";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/site-config";
import { PUBLIC_SCHOOL_SELECTOR_PATH } from "@/lib/schools/public-schools";
import styles from "./commercial-closing.module.css";

export function PublicSiteFooter() {
  return (
    <footer className={`${styles.root} ${styles.footer}`}>
      <div className={`${styles.publicContainer} ${styles.footerMain}`}>
        <div className={styles.footerBrand}>
          <Image src="/brand/educore/logo-light.svg" alt="EducaCora" width={512} height={150} />
          <p>Dirección, docentes y familias en un entorno común.</p>
        </div>

        <nav className={styles.footerLinks} aria-label="Enlaces del pie de página">
          <Link href="/experience">Experience</Link>
          <Link href="/app">Aplicación</Link>
          <Link href={PUBLIC_SCHOOL_SELECTOR_PATH}>Acceso a centros</Link>
          <ContactTrigger
            origin="home_footer"
            originLabel="Footer público"
            className={styles.footerButton}
          >
            Contacto
          </ContactTrigger>
          <Link href="/politica-privacidad">Política de Privacidad</Link>
        </nav>
      </div>

      <div className={`${styles.publicContainer} ${styles.footerBottom}`}>
        <span>© 2026 EducaCora</span>
        <span>El corazón de tu centro educativo.</span>
        <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
      </div>
    </footer>
  );
}
