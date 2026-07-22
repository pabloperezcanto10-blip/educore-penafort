import { RolePerspectivesExperience } from "@/components/landing/role-perspectives-experience";
import styles from "./role-perspectives.module.css";

export function RolePerspectivesSection() {
  return (
    <section
      id="roles"
      className={styles.section}
      data-role-perspectives-scene
      data-corium-contained-scene
      data-corium-message="Te mostraré la plataforma desde el perfil que elijas."
    >
      <div className={styles.ambient} aria-hidden="true" />
      <div className={`container ${styles.container}`}>
        <header className={`${styles.heading} landing-reveal`}>
          <div className={styles.bridge}>
            <span>Módulos conectados</span>
            <i aria-hidden="true" />
            <span>Cada perfil accede a lo que necesita</span>
          </div>
          <div className="section-kicker">Perspectivas por rol</div>
          <h2>La misma plataforma, adaptada a cada perfil</h2>
          <p>
            Dirección, docentes y familias acceden a la información que necesitan desde una experiencia diseñada para su día a día.
          </p>
        </header>

        <RolePerspectivesExperience />
      </div>
    </section>
  );
}
