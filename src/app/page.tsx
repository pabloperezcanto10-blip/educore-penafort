import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { ContactTrigger } from "@/components/contact/contact-modal";
import { ConnectedModulesSection } from "@/components/landing/connected-modules-section";
import { LandingExperienceMotion } from "@/components/landing/landing-experience-motion";
import { LivingHero } from "@/components/landing/living-hero";
import { MobilePublicNav } from "@/components/landing/mobile-public-nav";
import { RolePerspectivesSection } from "@/components/landing/role-perspectives-section";
import { InstallEduCoreButton } from "@/components/pwa/install-educore-button";
import { PUBLIC_CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_URL, SITE_URL } from "@/lib/site-config";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/educore/logo.svg`,
    image: SITE_OG_IMAGE_URL,
    description: SITE_DESCRIPTION
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "es"
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    image: SITE_OG_IMAGE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, iOS, Android, Windows, macOS",
    offers: {
      "@type": "Offer",
      url: SITE_URL,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock"
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL
    }
  }
];

const schools = [
  {
    name: "Colegio Peñafort",
    description: "Accede a tu plataforma del centro.",
    href: "/login"
  }
];

const solvedItems = [
  "Comunicación centralizada entre familias, docentes y dirección.",
  "Cuaderno, criterios, observaciones y boletines conectados.",
  "Asistencia y seguimiento diario desde cada sesión.",
  "Supervisión directiva de actividad y prioridades."
];

export default function HomePage() {
  return (
    <main className="educore-public-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c")
        }}
      />
      <LandingExperienceMotion />
      <style dangerouslySetInnerHTML={{ __html: `
        .educore-public-page {
          --navy-950: var(--ec-color-navy-950);
          --navy-900: var(--ec-color-navy-900);
          --navy-800: var(--ec-color-navy-800);
          --green-700: var(--ec-color-green-700);
          --green-600: var(--ec-color-green-600);
          --green-500: var(--ec-color-green-500);
          --gold-600: var(--ec-color-gold-600);
          --gold-500: var(--ec-color-gold-500);
          --gold-300: var(--ec-color-gold-300);
          --cream-50: var(--ec-surface-page);
          --cream-100: var(--ec-surface-muted);
          --stone-900: var(--ec-text-primary);
          --stone-700: var(--ec-text-secondary);
          --stone-500: var(--ec-text-muted);
          --stone-200: var(--ec-border-subtle);
          --white: var(--ec-surface-light);
          --shadow-sm: var(--ec-shadow-soft);
          --shadow-md: var(--ec-shadow-card);
          --shadow-premium: var(--ec-shadow-elevated);
          --radius-xl: var(--ec-radius-xl);
          --radius-lg: var(--ec-radius-lg);
          --max: 1180px;
          min-height: 100vh;
          overflow-x: clip;
          color: var(--stone-900);
          background: var(--cream-50);
          font-family: Inter, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .educore-public-page * { box-sizing: border-box; }
        .educore-public-page a { color: inherit; text-decoration: none; }
        .educore-public-page .container { width: min(var(--max), calc(100% - 40px)); margin: 0 auto; }
        .educore-public-page .brand { display: inline-flex; min-height: 44px; flex-shrink: 0; align-items: center; gap: 12px; }
        .educore-public-page .brand-logo { display: block; width: 184px; height: auto; }
        .educore-public-page .brand-icon {
          width: 42px;
          height: 42px;
          display: block;
          filter: drop-shadow(0 12px 18px rgba(47, 138, 112, .22));
        }
        .educore-public-page .nav {
          position: sticky;
          top: 0;
          z-index: var(--ec-z-sticky);
          backdrop-filter: blur(22px);
          background: rgba(246, 243, 236, .82);
          border-bottom: 1px solid rgba(231, 235, 238, .85);
        }
        .educore-public-page .nav-inner {
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .educore-public-page .nav-links { display: flex; align-items: center; gap: 28px; color: var(--stone-700); font-size: 14px; font-weight: 600; }
        .educore-public-page .nav-link-button { border: 0; background: transparent; color: inherit; font: inherit; font-weight: inherit; cursor: pointer; padding: 0; }
        .educore-public-page .nav-link-button:hover { color: var(--navy-950); }
        .educore-public-page .nav-link-button:focus-visible { outline: 3px solid rgba(47,138,112,.28); outline-offset: 4px; border-radius: 999px; }
        .educore-public-page .nav-contact {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(231,235,238,.95);
          border-radius: 999px;
          background: rgba(255,255,255,.52);
          padding: 0 13px;
          color: var(--stone-700);
          transition: background var(--ec-motion-short) ease, border-color var(--ec-motion-short) ease, color var(--ec-motion-short) ease, box-shadow var(--ec-motion-short) ease;
        }
        .educore-public-page .nav-contact:hover {
          border-color: rgba(47,138,112,.22);
          background: rgba(255,255,255,.92);
          color: var(--navy-950);
          box-shadow: 0 10px 24px rgba(15,27,46,.06);
        }
        .educore-public-page .nav-contact svg { width: 15px; height: 15px; color: var(--green-700); }
        .educore-public-page .nav-actions { display: flex; flex-shrink: 0; align-items: center; gap: 12px; }
        .educore-public-page .mobile-public-nav { display: none; position: relative; }
        .educore-public-page .install-wrap { position: relative; display: inline-flex; }
        .educore-public-page .install-help {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          z-index: 30;
          width: min(320px, calc(100vw - 32px));
          border-radius: 18px;
          border: 1px solid var(--stone-200);
          background: white;
          box-shadow: var(--shadow-md);
          padding: 14px 16px;
          color: var(--stone-700);
          font-size: 13px;
          font-weight: 650;
          line-height: 1.55;
          text-align: left;
        }
        .educore-public-page .landing-reveal {
          opacity: 0;
          transform: translateY(var(--ec-motion-reveal-distance));
          transition:
            opacity var(--ec-motion-reveal) var(--ec-ease-enter),
            transform var(--ec-motion-reveal) var(--ec-ease-enter);
          will-change: opacity, transform;
        }
        .educore-public-page .landing-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
          will-change: auto;
        }
        .educore-public-page .landing-delay-1 { transition-delay: var(--ec-motion-stagger); }
        .educore-public-page .landing-delay-2 { transition-delay: calc(var(--ec-motion-stagger) * 2); }
        .educore-public-page .landing-delay-3 { transition-delay: calc(var(--ec-motion-stagger) * 3); }
        .educore-public-page .landing-delay-4 { transition-delay: calc(var(--ec-motion-stagger) * 4); }
        .educore-public-page .contextual-corium {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: var(--ec-z-corium);
          display: inline-flex;
          max-width: min(360px, calc(100vw - 36px));
          align-items: center;
          gap: 10px;
          border-radius: 999px;
          border: 1px solid rgba(47,138,112,.18);
          background: rgba(255,255,255,.92);
          padding: 8px 14px 8px 8px;
          color: var(--navy-950);
          box-shadow: 0 18px 50px rgba(15,27,46,.13);
          backdrop-filter: blur(18px);
          font-size: 13px;
          font-weight: 750;
          line-height: 1.35;
          animation: landing-corium-in var(--ec-motion-reveal) var(--ec-ease-enter) both;
        }
        .educore-public-page .contextual-corium-toggle,
        .educore-public-page .contextual-corium-close {
          display: inline-grid;
          flex: 0 0 auto;
          place-items: center;
          border: 0;
          background: transparent;
          color: var(--stone-700);
          cursor: pointer;
        }
        .educore-public-page .contextual-corium-toggle { min-width: 40px; min-height: 40px; padding: 0; border-radius: 999px; }
        .educore-public-page .contextual-corium-toggle:disabled { cursor: default; }
        .educore-public-page .contextual-corium-close { display: none; width: 44px; height: 44px; border-radius: 999px; }
        .educore-public-page .contextual-corium-close svg { width: 18px; height: 18px; }
        .educore-public-page .contextual-corium-toggle:focus-visible,
        .educore-public-page .contextual-corium-close:focus-visible { outline: 3px solid var(--ec-ring-brand); outline-offset: 2px; }
        .educore-public-page .contextual-corium-message { min-width: 0; }
        .educore-public-page .contextual-corium-avatar {
          width: 38px;
          height: 38px;
          object-fit: cover;
          border-radius: 999px;
          box-shadow: 0 0 0 1px rgba(210,166,87,.28), 0 12px 24px rgba(47,138,112,.18);
          animation: landing-corium-breathe var(--ec-motion-ambient) ease-in-out infinite;
        }
        .educore-public-page .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          border: 1px solid transparent;
          cursor: pointer;
          transition: transform var(--ec-motion-short) var(--ec-ease-move), background var(--ec-motion-short) ease, border-color var(--ec-motion-short) ease, box-shadow var(--ec-motion-short) ease;
          white-space: nowrap;
        }
        .educore-public-page .btn:hover { transform: translateY(-2px); }
        .educore-public-page .btn:active { transform: translateY(0) scale(.99); }
        .educore-public-page .btn:focus-visible { outline: 3px solid rgba(47,138,112,.28); outline-offset: 3px; }
        .educore-public-page .btn-primary { background: var(--navy-950); color: white; box-shadow: 0 16px 35px rgba(15, 27, 46, .2); }
        .educore-public-page .btn-primary:hover { background: var(--navy-800); box-shadow: 0 22px 44px rgba(15, 27, 46, .24); }
        .educore-public-page .btn-soft { background: rgba(255,255,255,.72); color: var(--navy-950); border-color: var(--stone-200); }
        .educore-public-page .btn-soft:hover { background: white; box-shadow: 0 14px 30px rgba(15,27,46,.08); }
        .educore-public-page .btn-gold { background: linear-gradient(135deg, var(--green-600), var(--gold-500)); color: white; box-shadow: 0 16px 35px rgba(47, 138, 112, .24); }
        .educore-public-page .btn-gold:hover { box-shadow: 0 22px 44px rgba(47, 138, 112, .28); }
        .educore-public-page .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border-radius: 999px;
          background: rgba(47,138,112,.1);
          color: var(--green-700);
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 22px;
          border: 1px solid rgba(47,138,112,.15);
        }
        .educore-public-page .hero-actions { display: flex; align-items: center; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
        .educore-public-page section:not([data-hero-corium-scene]):not([data-connected-modules-scene]):not([data-role-perspectives-scene]) { padding: var(--ec-space-section) 0; scroll-margin-top: 94px; }
        .educore-public-page #acceso,
        .educore-public-page #experience { padding-block: var(--ec-space-section-compact); }
        .educore-public-page .section-head { max-width: 760px; margin: 0 auto 34px; text-align: center; }
        .educore-public-page .section-kicker { color: var(--gold-600); text-transform: uppercase; font-size: 12px; letter-spacing: .14em; font-weight: 900; margin-bottom: 12px; }
        .educore-public-page .section-head h2 { margin: 0; color: var(--navy-950); font-size: clamp(34px, 4vw, 52px); line-height: 1.04; letter-spacing: -.055em; }
        .educore-public-page .section-head p { margin: 18px auto 0; color: var(--stone-700); font-size: 17px; line-height: 1.7; }
        .educore-public-page .module-panel,
        .educore-public-page .security-card,
        .educore-public-page .brand-note {
          background: white;
          border: 1px solid var(--stone-200);
          box-shadow: var(--shadow-sm);
        }
        .educore-public-page .solution-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 24px; align-items: stretch; }
        .educore-public-page .module-panel {
          border-radius: var(--radius-xl);
          padding: 30px;
          transition: transform var(--ec-motion-medium) var(--ec-ease-enter), box-shadow var(--ec-motion-medium) ease, border-color var(--ec-motion-medium) ease;
        }
        .educore-public-page .module-panel:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: rgba(47,138,112,.16); }
        .educore-public-page .module-panel h2,
        .educore-public-page .module-panel h3 { margin: 0; color: var(--navy-950); font-size: clamp(31px, 4vw, 46px); line-height: 1.05; letter-spacing: -.055em; }
        .educore-public-page .module-panel p { color: var(--stone-700); line-height: 1.72; margin: 14px 0 0; }
        .educore-public-page .solution-list { display: grid; gap: 10px; }
        .educore-public-page .solution-item {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 12px;
          align-items: start;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255,255,255,.7);
          border: 1px solid var(--stone-200);
          color: var(--stone-700);
          font-size: 14px;
          font-weight: 650;
          line-height: 1.45;
          transition: transform var(--ec-motion-short) ease, border-color var(--ec-motion-short) ease, box-shadow var(--ec-motion-short) ease;
        }
        .educore-public-page .solution-item:hover { transform: translateX(4px); border-color: rgba(47,138,112,.22); box-shadow: 0 14px 30px rgba(15,27,46,.06); }
        .educore-public-page .solution-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(47,138,112,.1);
          color: var(--green-700);
          font-weight: 900;
        }
        .educore-public-page .module-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .educore-public-page .corium-card {
          display: grid;
          grid-template-columns: .9fr 1.1fr;
          gap: 28px;
          align-items: center;
          border-radius: 36px;
          border: 1px solid var(--stone-200);
          background: white;
          box-shadow: var(--shadow-md);
          padding: 34px;
          overflow: hidden;
          transition: transform var(--ec-motion-medium) var(--ec-ease-enter), box-shadow var(--ec-motion-medium) ease, border-color var(--ec-motion-medium) ease;
        }
        .educore-public-page .corium-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-premium); border-color: rgba(47,138,112,.18); }
        .educore-public-page .corium-visual {
          display: grid;
          place-items: center;
          min-height: 320px;
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(246,243,236,.92), rgba(255,255,255,.78));
          border: 1px solid rgba(231,235,238,.8);
        }
        .educore-public-page .corium-logo {
          width: min(100%, 520px);
          height: auto;
          border-radius: 24px;
        }
        .educore-public-page .corium-mascot {
          width: min(240px, 72%);
          height: auto;
          filter: drop-shadow(0 18px 30px rgba(15, 23, 42, .10));
          animation: landing-corium-breathe var(--ec-motion-ambient) ease-in-out infinite;
        }
        .educore-public-page .corium-points {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 22px;
        }
        .educore-public-page .corium-point {
          border-radius: 16px;
          border: 1px solid var(--stone-200);
          background: rgba(246,243,236,.58);
          padding: 12px 14px;
          color: var(--stone-700);
          font-size: 13px;
          font-weight: 700;
        }
        .educore-public-page .access-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 24px; align-items: stretch; }
        .educore-public-page .access-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 24px;
          border-radius: var(--radius-xl);
          background: white;
          border: 1px solid var(--stone-200);
          box-shadow: var(--shadow-sm);
          transition: transform var(--ec-motion-short) var(--ec-ease-move), box-shadow var(--ec-motion-short) ease, border-color var(--ec-motion-short) ease;
        }
        .educore-public-page .access-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-premium); border-color: rgba(47,138,112,.22); }
        .educore-public-page .access-card strong { display: block; color: var(--navy-950); font-size: 18px; letter-spacing: -.03em; margin-bottom: 6px; }
        .educore-public-page .access-card span { color: var(--stone-700); font-size: 14px; line-height: 1.55; }
        .educore-public-page .access-card .btn-primary { color: var(--white); line-height: 1; }
        .educore-public-page .brand-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border-radius: var(--radius-xl);
          padding: 24px 30px;
        }
        .educore-public-page .brand-note p { margin: 0; color: var(--stone-700); line-height: 1.62; font-size: 14px; max-width: 660px; }
        .educore-public-page .app-section { background: linear-gradient(180deg, white, var(--cream-50)); }
        .educore-public-page .app-card {
          border-radius: 36px;
          background: linear-gradient(135deg, var(--navy-950), var(--navy-800));
          color: white;
          padding: 36px 40px;
          display: grid;
          grid-template-columns: 1.18fr .82fr;
          gap: 28px;
          align-items: center;
          box-shadow: var(--shadow-md);
          overflow: hidden;
          position: relative;
          transition: transform var(--ec-motion-medium) var(--ec-ease-enter), box-shadow var(--ec-motion-medium) ease;
        }
        .educore-public-page .app-card:hover { transform: translateY(-4px); box-shadow: 0 30px 90px rgba(15,27,46,.2); }
        .educore-public-page .app-card::after {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(210,166,87,.38), transparent 65%);
          right: -90px;
          top: -90px;
        }
        .educore-public-page .app-card > * { position: relative; z-index: 1; }
        .educore-public-page .app-card h2 { margin: 0; font-size: clamp(32px, 4vw, 48px); line-height: 1.05; letter-spacing: -.055em; }
        .educore-public-page .app-card p { color: rgba(255,255,255,.72); line-height: 1.7; font-size: 17px; margin: 14px 0 0; }
        .educore-public-page .app-preview {
          border-radius: 28px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.14);
          padding: 22px;
          display: grid;
          gap: 12px;
        }
        .educore-public-page .app-preview-line { height: 10px; border-radius: 999px; background: rgba(255,255,255,.22); }
        .educore-public-page .app-preview-line.green { background: linear-gradient(90deg, var(--green-500), var(--gold-500)); width: 72%; }
        .educore-public-page .security { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .educore-public-page .security-card { padding: 24px; border-radius: var(--radius-lg); transition: transform var(--ec-motion-short) ease, box-shadow var(--ec-motion-short) ease, border-color var(--ec-motion-short) ease; }
        .educore-public-page .security-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: rgba(47,138,112,.18); }
        .educore-public-page .security-card strong { display: block; margin-bottom: 8px; color: var(--navy-950); }
        .educore-public-page .security-card span { color: var(--stone-700); font-size: 14px; line-height: 1.6; }
        .educore-public-page .cta { padding: 64px 0 82px; }
        .educore-public-page .cta-card { text-align: center; border-radius: 38px; padding: 54px 34px; background: white; border: 1px solid var(--stone-200); box-shadow: var(--shadow-md); transition: transform var(--ec-motion-medium) ease, box-shadow var(--ec-motion-medium) ease, border-color var(--ec-motion-medium) ease; }
        .educore-public-page .cta-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-premium); border-color: rgba(47,138,112,.16); }
        .educore-public-page .cta-card h2 { margin: 0; font-size: clamp(36px, 5vw, 58px); letter-spacing: -.06em; color: var(--navy-950); }
        .educore-public-page .cta-card p { max-width: 650px; margin: 18px auto 30px; color: var(--stone-700); font-size: 17px; line-height: 1.7; }
        .educore-public-page .contact-close { padding: 0 0 34px; }
        .educore-public-page .contact-close-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border-radius: 30px;
          border: 1px solid var(--stone-200);
          background: rgba(255,255,255,.82);
          box-shadow: var(--shadow-sm);
          padding: 28px 30px;
        }
        .educore-public-page .contact-close-card h2 { margin: 0; font-size: clamp(28px, 4vw, 42px); letter-spacing: -.05em; color: var(--navy-950); }
        .educore-public-page .contact-close-card p { margin: 10px 0 0; max-width: 560px; color: var(--stone-700); font-size: 16px; line-height: 1.65; }
        .educore-public-page .contact-close-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
        .educore-public-page .contact-email { color: var(--stone-500); font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
        .educore-public-page .contact-email:hover { color: var(--green-700); }
        .educore-public-page footer { padding: 30px 0 42px; color: var(--stone-500); font-size: 13px; }
        .educore-public-page .footer-inner { display: flex; justify-content: space-between; gap: 20px; align-items: center; border-top: 1px solid var(--stone-200); padding-top: 24px; }
        .educore-public-page .footer-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px 14px; text-align: right; }
        .educore-public-page .footer-link { border: 0; background: transparent; color: var(--stone-700); font: inherit; font-weight: 750; cursor: pointer; padding: 0; }
        .educore-public-page .footer-link:hover { color: var(--green-700); text-decoration: underline; text-underline-offset: 4px; }

        .educore-public-page .surface-card--informative:hover {
          transform: none;
          border-color: var(--stone-200);
          box-shadow: var(--shadow-sm);
        }
        .educore-public-page .solution-item:hover { transform: none; box-shadow: none; }
        @media (hover: hover) {
          .educore-public-page .surface-card--interactive:hover {
            transform: translateY(-2px);
            border-color: rgba(47,138,112,.22);
            box-shadow: var(--shadow-md);
          }
          .educore-public-page .surface-card--featured:hover {
            transform: translateY(-3px);
            border-color: rgba(47,138,112,.18);
            box-shadow: var(--shadow-premium);
          }
        }

        .educore-public-page .mobile-nav-trigger {
          position: relative;
          z-index: 2;
          display: inline-grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid var(--stone-200);
          border-radius: 999px;
          background: rgba(255,255,255,.76);
          color: var(--navy-950);
          cursor: pointer;
          transition: background var(--ec-motion-short) ease, border-color var(--ec-motion-short) ease;
        }
        .educore-public-page .mobile-nav-trigger:hover { border-color: rgba(47,138,112,.24); background: white; }
        .educore-public-page .mobile-nav-trigger:focus-visible { outline: 3px solid var(--ec-ring-brand); outline-offset: 3px; }
        .educore-public-page .mobile-nav-trigger svg { width: 20px; height: 20px; }
        .educore-public-page .mobile-nav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 0;
          border: 0;
          background: var(--ec-overlay);
          cursor: default;
        }
        .educore-public-page .mobile-nav-panel {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          z-index: 1;
          width: min(320px, calc(100vw - 28px));
          max-height: calc(100dvh - 92px);
          overflow-y: auto;
          border: 1px solid var(--stone-200);
          border-radius: var(--ec-radius-lg);
          background: rgba(255,255,255,.98);
          box-shadow: var(--shadow-premium);
          padding: 12px;
          animation: landing-nav-in var(--ec-motion-short) var(--ec-ease-enter) both;
        }
        .educore-public-page .mobile-nav-heading { padding: 8px 10px 10px; color: var(--stone-500); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
        .educore-public-page .mobile-nav-panel nav { display: grid; gap: 2px; }
        .educore-public-page .mobile-nav-link {
          display: flex;
          width: 100%;
          min-height: 44px;
          align-items: center;
          gap: 10px;
          border: 0;
          border-radius: var(--ec-radius-sm);
          background: transparent;
          padding: 0 12px;
          color: var(--stone-700);
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }
        .educore-public-page .mobile-nav-link:hover { background: rgba(47,138,112,.08); color: var(--navy-950); }
        .educore-public-page .mobile-nav-link:focus-visible { outline: 3px solid var(--ec-ring-brand); outline-offset: 1px; }
        .educore-public-page .mobile-nav-contact svg { width: 17px; height: 17px; color: var(--green-700); }
        .educore-public-page .mobile-nav-actions { display: grid; gap: 6px; margin-top: 8px; border-top: 1px solid var(--stone-200); padding-top: 10px; }
        .educore-public-page .mobile-nav-actions .btn { width: 100%; }
        @media (max-width: 1120px) {
          .educore-public-page .nav-links { display: none; }
          .educore-public-page .mobile-public-nav { display: block; }
        }
        @media (max-width: 980px) {
          .educore-public-page .nav-links { display: none; }
          .educore-public-page .solution-grid,
          .educore-public-page .corium-card,
          .educore-public-page .app-card,
          .educore-public-page .access-grid { grid-template-columns: 1fr; }
          .educore-public-page .module-list,
          .educore-public-page .security { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .educore-public-page .container { width: min(100% - 28px, var(--max)); }
          .educore-public-page .nav-inner { height: 68px; gap: 8px; }
          .educore-public-page .brand-logo { width: clamp(112px, 30vw, 132px); }
          .educore-public-page .nav-actions { gap: 8px; }
          .educore-public-page .nav-actions > .btn-soft { display: none; }
          .educore-public-page .nav-actions > .btn-primary { min-height: 44px; padding-inline: 12px; font-size: 12px; }
          .educore-public-page section:not([data-hero-corium-scene]):not([data-connected-modules-scene]):not([data-role-perspectives-scene]) { padding-block: var(--ec-space-section-compact); scroll-margin-top: 82px; }
          .educore-public-page .module-list,
          .educore-public-page .corium-points,
          .educore-public-page .security { grid-template-columns: 1fr; }
          .educore-public-page .brand-note,
          .educore-public-page .access-card { align-items: flex-start; flex-direction: column; }
          .educore-public-page .app-card { padding: 30px 22px; border-radius: 28px; }
          .educore-public-page .contact-close-card { align-items: flex-start; flex-direction: column; padding: 24px 22px; }
          .educore-public-page .contact-close-actions { align-items: flex-start; }
          .educore-public-page .footer-inner { flex-direction: column; align-items: flex-start; }
          .educore-public-page .footer-meta { justify-content: flex-start; text-align: left; }
          .educore-public-page .contextual-corium {
            left: auto;
            right: max(14px, env(safe-area-inset-right));
            bottom: max(14px, env(safe-area-inset-bottom));
            width: 52px;
            min-height: 52px;
            padding: 6px;
            justify-content: flex-end;
            border-radius: 999px;
            transition: width var(--ec-motion-medium) var(--ec-ease-enter), border-radius var(--ec-motion-short) ease, padding var(--ec-motion-short) ease;
          }
          .educore-public-page .contextual-corium.is-expanded { width: min(330px, calc(100vw - 28px)); padding: 6px 6px 6px 8px; border-radius: 22px; }
          .educore-public-page .contextual-corium-avatar { width: 40px; height: 40px; }
          .educore-public-page .contextual-corium-message { display: none; flex: 1; padding-left: 4px; font-size: 12px; }
          .educore-public-page .contextual-corium.is-expanded .contextual-corium-message { display: block; }
          .educore-public-page .contextual-corium-close { display: inline-grid; }
        }
        @media (prefers-reduced-motion: reduce) {
          .educore-public-page .landing-reveal,
          .educore-public-page .landing-reveal.is-visible,
          .educore-public-page .module-panel,
          .educore-public-page .solution-item,
          .educore-public-page .corium-card,
          .educore-public-page .corium-mascot,
          .educore-public-page .contextual-corium,
          .educore-public-page .contextual-corium-avatar,
          .educore-public-page .access-card,
          .educore-public-page .app-card,
          .educore-public-page .security-card,
          .educore-public-page .cta-card,
          .educore-public-page .btn,
          .educore-public-page .mobile-nav-panel {
            animation: none;
            transform: none;
            transition: none;
          }
          .educore-public-page .landing-reveal { opacity: 1; }
        }
        @keyframes landing-corium-in {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes landing-corium-breathe {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 18px 30px rgba(15,23,42,.10)); }
          50% { transform: translateY(-3px) scale(1.012); filter: drop-shadow(0 22px 34px rgba(47,138,112,.16)); }
        }
        @keyframes landing-nav-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />

      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href="/">
            <Image className="brand-logo" src="/brand/educore/logo.svg" alt="EducaCora" width={512} height={150} priority />
          </Link>
          <nav className="nav-links" aria-label="Principal">
            <a href="#resuelve">Qué resuelve</a>
            <a href="#modulos">Módulos</a>
            <a href="#roles">Roles</a>
            <a href="#acceso">Centros</a>
            <Link href="/experience">Experience</Link>
            <a href="#seguridad">Seguridad</a>
            <ContactTrigger origin="home_header" originLabel="Home — navegación" className="nav-link-button nav-contact">
              <Mail aria-hidden="true" />
              Contacto
            </ContactTrigger>
          </nav>
          <div className="nav-actions">
            <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            <Link className="btn btn-primary" href="/experience">Probar EducaCora</Link>
            <MobilePublicNav />
          </div>
        </div>
      </header>

      <LivingHero />

      <section id="acceso" data-corium-message="Accede a tu centro o prueba la Experience.">
        <div className="container access-grid">
          <div className="module-panel surface-card--informative landing-reveal">
            <div className="section-kicker">Centros conectados</div>
            <h2>Accede a tu centro educativo</h2>
            <p>Selecciona el centro al que perteneces para acceder a tu plataforma EducaCora.</p>
          </div>
          <div className="module-list landing-reveal landing-delay-1" style={{ gridTemplateColumns: "1fr" }}>
            {schools.map((school) => (
              <Link className="access-card surface-card--interactive" href={school.href} key={school.name}>
                <div className="brand" style={{ gap: 14 }}>
                  <Image className="brand-icon" src="/brand/educore/icon.svg" alt="" width={256} height={256} />
                  <div>
                    <strong>{school.name}</strong>
                    <span>{school.description}</span>
                  </div>
                </div>
                <span className="btn btn-primary">Entrar</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="resuelve" data-corium-message="Aquí empieza a reducirse el ruido operativo.">
        <div className="container solution-grid">
          <div className="module-panel surface-card--informative landing-reveal">
            <div className="section-kicker">Qué resuelve EducaCora</div>
            <h2>Menos ruido operativo. Más centro educativo.</h2>
            <p>Comunicación, evaluación, asistencia y seguimiento en una única experiencia coherente.</p>
          </div>
          <div className="solution-list landing-reveal landing-delay-1">
            {solvedItems.map((item, index) => (
              <div className="solution-item" key={item}>
                <span className="solution-dot">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConnectedModulesSection />

      <section id="corium-ai" data-corium-message="Corium acompaña sin invadir.">
        <div className="container">
          <div className="corium-card surface-card--featured landing-reveal">
            <div>
              <div className="section-kicker">Corium AI</div>
              <Image
                src="/brand/corium/corium-logo-horizontal.png"
                alt="Corium AI. El corazón inteligente de EducaCora"
                width={675}
                height={258}
                className="corium-logo"
              />
              <h2 className="mt-6 text-[clamp(32px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.055em] text-[#0f1b2e]">
                Conoce a Corium AI
              </h2>
              <p className="mt-4 text-[17px] leading-7 text-[#4e5b61]">
                El corazón inteligente de EducaCora. Acompaña el trabajo educativo sin invadir la experiencia.
              </p>
              <div className="corium-points" aria-label="Ámbitos de ayuda de Corium AI">
                <span className="corium-point">Profesorado</span>
                <span className="corium-point">Dirección</span>
                <span className="corium-point">Familias</span>
                <span className="corium-point">Alumnado</span>
                <span className="corium-point">Comunicación</span>
                <span className="corium-point">Evaluación</span>
              </div>
            </div>
            <div className="corium-visual">
              <CoriumAvatar variant="waving" className="corium-mascot" />
            </div>
          </div>
        </div>
      </section>

      <RolePerspectivesSection />

      <section id="experience" data-corium-message="Pruébalo como un centro real.">
        <div className="container brand-note surface-card--informative landing-reveal">
          <Image src="/brand/educore/logo.svg" alt="EducaCora" width={512} height={150} style={{ width: 178, height: "auto" }} />
          <p>EducaCora Experience no es un vídeo ni una galería de capturas. Es el producto real funcionando con datos ficticios para Dirección, Docentes y Familias.</p>
          <Link className="btn btn-primary" href="/experience">Probar EducaCora</Link>
        </div>
      </section>

      <section className="app-section" id="app" data-corium-message="Lleva EducaCora siempre contigo.">
        <div className="container app-card surface-card--featured landing-reveal">
          <div>
            <div className="section-kicker" style={{ color: "var(--gold-300)" }}>App instalable</div>
            <h2>Instala EducaCora en móvil, tablet u ordenador.</h2>
            <p>Acceso rápido a tu centro desde cualquier dispositivo.</p>
            <div className="hero-actions">
              <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
              <InstallEduCoreButton className="btn btn-soft" />
            </div>
          </div>
          <div className="app-preview" aria-hidden="true">
            <Image src="/brand/educore/app-icon-dark.svg" alt="" width={512} height={512} style={{ width: 72, height: 72, borderRadius: 18 }} />
            <div className="app-preview-line green" />
            <div className="app-preview-line" />
            <div className="app-preview-line" style={{ width: "82%" }} />
            <div className="app-preview-line" style={{ width: "58%" }} />
          </div>
        </div>
      </section>

      <section id="seguridad" data-corium-message="La confianza se diseña desde el principio.">
        <div className="container">
          <div className="section-head landing-reveal">
            <div className="section-kicker">Confianza</div>
            <h2>Seguridad y privacidad desde el diseño.</h2>
          </div>
          <div className="security landing-reveal landing-delay-1">
            <div className="security-card surface-card--informative"><strong>Roles claros</strong><span>Dirección, docentes, administración y familias con experiencias y permisos diferenciados.</span></div>
            <div className="security-card surface-card--informative"><strong>Datos visibles según permisos</strong><span>Cada usuario accede únicamente a la información que le corresponde.</span></div>
            <div className="security-card surface-card--informative"><strong>Preparado para RGPD</strong><span>Arquitectura pensada para trazabilidad, control de acceso y evolución segura.</span></div>
          </div>
        </div>
      </section>

      <section className="cta" id="demo" data-corium-message="¿Quieres verlo funcionando?">
        <div className="container">
          <div className="cta-card surface-card--featured landing-reveal">
            <div className="eyebrow">EducaCora SaaS educativo</div>
            <h2>Prueba EducaCora desde dentro.</h2>
            <p>Entra en EducaCora Experience y recorre la plataforma como dirección, docente o familia.</p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link className="btn btn-primary" href="/experience">Probar EducaCora</Link>
              <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-close" aria-labelledby="home-contact-title">
        <div className="container">
          <div className="contact-close-card landing-reveal">
            <div>
              <h2 id="home-contact-title">¿Quieres hablar con nosotros?</h2>
              <p>Cuéntanos las necesidades de tu centro y te responderemos personalmente.</p>
            </div>
            <div className="contact-close-actions">
              <ContactTrigger origin="home_closure" originLabel="Home — cierre" className="btn btn-soft">
                Contactar
              </ContactTrigger>
              <a className="contact-email" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <Image src="/brand/educore/logo.svg" alt="EducaCora" width={512} height={150} style={{ width: 132, height: "auto" }} />
          <div className="footer-meta">
            <span>© 2026 EducaCora · El corazón de tu centro educativo.</span>
            <ContactTrigger origin="home_footer" originLabel="Footer público" className="footer-link">
              Contactar
            </ContactTrigger>
            <a className="footer-link" href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
            <Link className="footer-link" href="/politica-privacidad">Política de Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
