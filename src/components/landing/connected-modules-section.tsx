import { ConnectedModulesExperience } from "@/components/landing/connected-modules-experience";
import styles from "./connected-modules.module.css";

export function ConnectedModulesSection() {
  return (
    <section
      id="modulos"
      className={styles.section}
      data-connected-modules-scene
      data-corium-contained-scene
      data-corium-message="Una acción, la información adecuada para cada perfil."
    >
      <div className={styles.ambient} aria-hidden="true" />
      <div className={`container ${styles.container}`}>
        <header className={`${styles.heading} landing-reveal`}>
          <div className="section-kicker">Ecosistema conectado</div>
          <h2>Todo el centro, conectado</h2>
          <p>
            Asistencia, seguimiento académico, comunicaciones y coordinación comparten la misma información.
          </p>
        </header>

        <ConnectedModulesExperience />

        <div className={styles.roleTransition} aria-hidden="true">
          <span>Una plataforma</span>
          <i />
          <span>Una experiencia para cada rol</span>
        </div>
      </div>
    </section>
  );
}
