import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Laptop,
  Mail,
  ShieldCheck,
  Smartphone,
  Tablet,
  UsersRound
} from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { ContactTrigger } from "@/components/contact/contact-modal";
import { InstallEduCoreButton } from "@/components/pwa/install-educore-button";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/site-config";
import styles from "./commercial-closing.module.css";

const experienceSteps = [
  { number: "01", title: "Elige un perfil", detail: "Dirección, Docente o Familia." },
  { number: "02", title: "Explora el producto", detail: "Navega por módulos conectados." },
  { number: "03", title: "Termina a tu ritmo", detail: "Corium puede acompañar el recorrido." }
] as const;

const trustItems = [
  {
    title: "Acceso por roles",
    detail: "Cada perfil accede a las herramientas de su función.",
    icon: UsersRound
  },
  {
    title: "Información según permisos",
    detail: "La visibilidad sigue los permisos de cada usuario.",
    icon: KeyRound
  },
  {
    title: "Demostración separada",
    detail: "Experience utiliza datos ficticios y separados del producto real.",
    icon: ShieldCheck
  }
] as const;

export function CommercialClosingSection() {
  return (
    <div className={styles.root} data-corium-contained-scene>
      <section
        id="experience"
        className={styles.gatewaySection}
        data-commercial-closing-section
        data-corium-contained-scene
        data-corium-message="Ahora puedes probar EducaCora desde dentro."
        aria-labelledby="experience-gateway-title"
      >
        <div className={`container ${styles.gatewayContainer}`}>
          <div className={`${styles.transitionBridge} landing-reveal`}>
            <span>Ya conoces cada perspectiva</span>
            <i aria-hidden="true" />
            <strong>Ahora puedes probarla</strong>
          </div>

          <div className={`${styles.gateway} landing-reveal landing-delay-1`}>
            <div className={styles.gatewayCopy}>
              <span className={styles.kicker}>EducaCora Experience</span>
              <h2 id="experience-gateway-title">Entra y comprueba cómo se siente el producto.</h2>
              <p>
                Explora el producto como Dirección, Docente o Familia en una demostración guiada y segura.
              </p>

              <div className={styles.roleChips} aria-label="Perfiles disponibles en EducaCora Experience">
                <span>Dirección</span>
                <span>Docente</span>
                <span>Familia</span>
              </div>

              <div className={styles.gatewayActions}>
                <Link className={styles.primaryAction} href="/experience">
                  Probar EducaCora
                  <ArrowRight aria-hidden="true" />
                </Link>
                <a className={styles.tertiaryAction} href="#acceso">Acceder a mi centro</a>
              </div>

              <div className={styles.demoAssurance}>
                <CheckCircle2 aria-hidden="true" />
                <span>Datos ficticios · Sin credenciales de un centro · Navegación de demostración</span>
              </div>
            </div>

            <div className={styles.gatewayJourney} aria-label="Cómo funciona la demostración">
              <div className={styles.journeyHeader}>
                <div>
                  <span>Recorrido de demostración</span>
                  <strong>Tú decides cómo explorar</strong>
                </div>
                <CoriumAvatar variant="iconDark" className={styles.coriumAvatar} />
              </div>

              <ol className={styles.journeyList}>
                {experienceSteps.map((step) => (
                  <li key={step.number}>
                    <span>{step.number}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                    </div>
                  </li>
                ))}
              </ol>

              <p className={styles.coriumMessage}>
                <strong>Corium AI</strong>
                Puede guiarte sin bloquear la navegación ni iniciar acciones reales.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="seguridad"
        className={styles.trustSection}
        data-commercial-closing-section
        data-corium-message="Acceso flexible y confianza integrada."
        aria-labelledby="trust-title"
      >
        <div className={`container ${styles.trustGrid}`}>
          <article id="app" className={`${styles.installPanel} landing-reveal`}>
            <div className={styles.installCopy}>
              <span className={styles.lightKicker}>Acceso flexible</span>
              <h2>Úsala desde cualquier dispositivo.</h2>
              <p>Accede desde el navegador o instala EducaCora en ordenador, tablet y móvil.</p>
            </div>

            <div className={styles.deviceRow} aria-label="EducaCora está disponible en ordenador, tablet y móvil">
              <span><Laptop aria-hidden="true" />Ordenador</span>
              <span><Tablet aria-hidden="true" />Tablet</span>
              <span><Smartphone aria-hidden="true" />Móvil</span>
            </div>

            <div className={styles.installActions}>
              <InstallEduCoreButton className={styles.installButton} />
              <Link className={styles.appLink} href="/app">Abrir la aplicación <ArrowRight aria-hidden="true" /></Link>
            </div>
          </article>

          <article className={`${styles.trustPanel} landing-reveal landing-delay-1`}>
            <div className={styles.trustHeading}>
              <span className={styles.kicker}>Confianza operativa</span>
              <h2 id="trust-title">La seguridad forma parte del producto.</h2>
              <p>La visibilidad se adapta al contexto y los permisos de cada perfil.</p>
            </div>

            <div className={styles.trustList}>
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className={styles.trustItem} key={item.title}>
                    <span aria-hidden="true"><Icon /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link className={styles.privacyLink} href="/politica-privacidad">
              Consultar la Política de Privacidad
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      <section
        id="demo"
        className={styles.decisionSection}
        data-commercial-closing-section
        data-corium-message="Puedes probar la plataforma o contarnos qué necesita tu centro."
        aria-labelledby="commercial-closing-title"
      >
        <div className={`container ${styles.decisionContainer}`}>
          <div className={`${styles.decisionPanel} landing-reveal`}>
            <div className={styles.decisionCopy}>
              <span className={styles.lightKicker}>Tu siguiente paso</span>
              <h2 id="commercial-closing-title">Pruébala ahora o cuéntanos qué necesita tu centro.</h2>
              <p>Conoce el producto a tu ritmo. Cuando quieras valorar si encaja, podemos hablar contigo.</p>

              <div className={styles.decisionPath} aria-label="Pasos para conocer EducaCora">
                <span><i>1</i>Prueba el producto</span>
                <span><i>2</i>Comprueba que encaja</span>
                <span><i>3</i>Habla con nosotros</span>
              </div>

              <Link className={styles.primaryAction} href="/experience">
                Probar EducaCora
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            <div id="contacto" className={styles.contactPanel}>
              <span className={styles.contactIcon} aria-hidden="true"><Mail /></span>
              <span className={styles.kicker}>Contacto</span>
              <h3>Solicita una conversación.</h3>
              <p>Cuéntanos brevemente qué necesita tu centro. Revisaremos el mensaje y contactaremos contigo.</p>
              <ContactTrigger origin="home_closure" originLabel="Home — cierre unificado" className={styles.secondaryAction}>
                Solicitar una reunión
                <ArrowRight aria-hidden="true" />
              </ContactTrigger>
              <a className={styles.emailLink} href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
              <p className={styles.contactPrivacy}>
                Al enviar el formulario podrás consultar y aceptar nuestra{" "}
                <Link href="/politica-privacidad">Política de Privacidad</Link>.
              </p>
            </div>
          </div>

          <p className={styles.existingCenterLink}>
            ¿Tu centro ya utiliza EducaCora? <a href="#acceso">Acceder a mi centro</a>
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`container ${styles.footerMain}`}>
          <div className={styles.footerBrand}>
            <Image src="/brand/educore/logo-light.svg" alt="EducaCora" width={512} height={150} />
            <p>Dirección, docentes y familias en un entorno común.</p>
          </div>

          <nav className={styles.footerLinks} aria-label="Enlaces del pie de página">
            <Link href="/experience">Experience</Link>
            <Link href="/app">Aplicación</Link>
            <a href="#acceso">Acceso a centros</a>
            <ContactTrigger origin="home_footer" originLabel="Footer público" className={styles.footerButton}>Contacto</ContactTrigger>
            <Link href="/politica-privacidad">Política de Privacidad</Link>
          </nav>
        </div>

        <div className={`container ${styles.footerBottom}`}>
          <span>© 2026 EducaCora</span>
          <span>El corazón de tu centro educativo.</span>
          <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}
