import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { HeroProductDemo } from "@/components/landing/hero-product-demo";
import styles from "./living-hero.module.css";

export function LivingHero() {
  return (
    <section
      className={styles.hero}
      data-corium-message="Bienvenido a EducaCora."
      data-hero-corium-scene
    >
      <div className={styles.ambient} aria-hidden="true" />
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <div className={`${styles.eyebrow} ${styles.enterEyebrow}`}>
            <span aria-hidden="true" />
            El corazón de tu centro educativo.
          </div>
          <h1 className={styles.enterTitle}>
            EducaCora conecta toda la <span>comunidad educativa</span>.
          </h1>
          <p className={`${styles.lead} ${styles.enterCopy}`}>
            Una plataforma escolar inteligente y centralizada para dirección, docentes y familias.
          </p>
          <div className={`${styles.actions} ${styles.enterActions}`}>
            <Link className="btn btn-primary" href="/experience">
              <Play aria-hidden="true" />
              Probar EducaCora
            </Link>
            <a className="btn btn-soft" href="#acceso">
              Accede a tu centro
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <ul className={`${styles.trustRow} ${styles.enterTrust}`} aria-label="Comunidad conectada">
            <li>Dirección</li>
            <li>Docentes</li>
            <li>Familias</li>
            <li>Alumnos</li>
          </ul>
        </div>

        <div className={`${styles.scene} ${styles.enterScene}`}>
          <HeroProductDemo />
        </div>
      </div>
      <div className={styles.transition} aria-hidden="true">
        <span>Una comunidad, un mismo espacio</span>
      </div>
    </section>
  );
}
