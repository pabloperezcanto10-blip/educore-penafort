import Image from "next/image";
import Link from "next/link";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { LandingExperienceMotion } from "@/components/landing/landing-experience-motion";
import { InstallEduCoreButton } from "@/components/pwa/install-educore-button";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_URL, SITE_URL } from "@/lib/site-config";

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

const modules = [
  ["Comunicación", "Conversaciones claras entre centro y familias."],
  ["Cuaderno", "Evaluación, criterios y observaciones conectadas."],
  ["Asistencia", "Pasar lista y hacer seguimiento diario."],
  ["Boletines", "Vista previa y documentos profesionales para familias."],
  ["Centro de control", "Prioridades y supervisión del colegio."],
  ["Corium AI", "Acompañamiento educativo integrado."]
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
      <style>{`
        .educore-public-page {
          --navy-950: #0f1b2e;
          --navy-900: #142235;
          --navy-800: #1d3045;
          --green-700: #1f765d;
          --green-600: #2f8a70;
          --green-500: #58aa91;
          --gold-600: #b88735;
          --gold-500: #d2a657;
          --gold-300: #edd8a6;
          --cream-50: #f6f3ec;
          --cream-100: #eee8db;
          --stone-900: #0f1b2e;
          --stone-700: #4e5b61;
          --stone-500: #6b737c;
          --stone-200: #e7ebee;
          --white: #ffffff;
          --shadow-sm: 0 10px 30px rgba(15, 27, 46, .07);
          --shadow-md: 0 22px 70px rgba(15, 27, 46, .12);
          --shadow-premium: 0 26px 80px rgba(15, 27, 46, .14);
          --radius-xl: 28px;
          --radius-lg: 22px;
          --max: 1180px;
          min-height: 100vh;
          overflow: hidden;
          color: var(--stone-900);
          background: var(--cream-50);
          font-family: Inter, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .educore-public-page * { box-sizing: border-box; }
        .educore-public-page a { color: inherit; text-decoration: none; }
        .educore-public-page .container { width: min(var(--max), calc(100% - 40px)); margin: 0 auto; }
        .educore-public-page .brand { display: inline-flex; align-items: center; gap: 12px; }
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
          z-index: 20;
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
        .educore-public-page .nav-actions { display: flex; align-items: center; gap: 12px; }
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
          transform: translateY(22px) scale(.992);
          transition:
            opacity 620ms cubic-bezier(.22, 1, .36, 1),
            transform 620ms cubic-bezier(.22, 1, .36, 1);
          will-change: opacity, transform;
        }
        .educore-public-page .landing-reveal.is-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .educore-public-page .landing-delay-1 { transition-delay: 80ms; }
        .educore-public-page .landing-delay-2 { transition-delay: 150ms; }
        .educore-public-page .landing-delay-3 { transition-delay: 220ms; }
        .educore-public-page .landing-delay-4 { transition-delay: 290ms; }
        .educore-public-page .contextual-corium {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 45;
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
          animation: landing-corium-in 680ms cubic-bezier(.22, 1, .36, 1) both;
        }
        .educore-public-page .contextual-corium-avatar {
          width: 38px;
          height: 38px;
          object-fit: cover;
          border-radius: 999px;
          box-shadow: 0 0 0 1px rgba(210,166,87,.28), 0 12px 24px rgba(47,138,112,.18);
          animation: landing-corium-breathe 5600ms ease-in-out infinite;
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
          transition: .2s ease;
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
        .educore-public-page .hero {
          position: relative;
          padding: 76px 0 70px;
        }
        .educore-public-page .hero::before {
          content: "";
          position: absolute;
          inset: -180px -160px auto auto;
          width: 620px;
          height: 620px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(210,166,87,.24), rgba(47,138,112,.12) 42%, transparent 68%);
          pointer-events: none;
          animation: landing-soft-light 9400ms ease-in-out infinite alternate;
        }
        .educore-public-page .hero-grid { display: grid; grid-template-columns: 1.02fr .98fr; gap: 58px; align-items: center; position: relative; }
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
        .educore-public-page .hero h1 {
          margin: 0;
          max-width: 760px;
          font-size: clamp(48px, 6vw, 82px);
          line-height: .95;
          letter-spacing: -.065em;
          color: var(--navy-950);
        }
        .educore-public-page .hero h1 .gradient {
          background: linear-gradient(135deg, var(--green-700), var(--gold-500));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .educore-public-page .hero p {
          max-width: 610px;
          margin: 26px 0 0;
          font-size: 18px;
          line-height: 1.72;
          color: var(--stone-700);
        }
        .educore-public-page .hero-actions { display: flex; align-items: center; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
        .educore-public-page .trust-row { display: flex; align-items: center; gap: 22px; margin-top: 32px; color: var(--stone-500); font-size: 13px; font-weight: 700; }
        .educore-public-page .trust-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold-500); }
        .educore-public-page .product-card {
          position: relative;
          border-radius: 34px;
          padding: 18px;
          background: linear-gradient(145deg, rgba(255,255,255,.94), rgba(246,243,236,.72));
          border: 1px solid rgba(255,255,255,.8);
          box-shadow: var(--shadow-md);
          transform: translateZ(0);
          transition: transform 360ms cubic-bezier(.22, 1, .36, 1), box-shadow 360ms cubic-bezier(.22, 1, .36, 1), border-color 360ms ease;
        }
        .educore-public-page .product-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-premium); border-color: rgba(47,138,112,.2); }
        .educore-public-page .product-card::before {
          content: "";
          position: absolute;
          inset: 25px;
          border-radius: 28px;
          background: radial-gradient(circle at 88% 18%, rgba(210,166,87,.28), transparent 36%);
          pointer-events: none;
        }
        .educore-public-page .mock-screen {
          position: relative;
          border-radius: 26px;
          background: var(--white);
          border: 1px solid var(--stone-200);
          min-height: 455px;
          overflow: hidden;
        }
        .educore-public-page .mock-top { height: 62px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; border-bottom: 1px solid var(--stone-200); }
        .educore-public-page .mock-title { font-size: 13px; font-weight: 800; color: var(--navy-950); }
        .educore-public-page .mock-badge { padding: 6px 10px; border-radius: 999px; background: rgba(47,138,112,.1); color: var(--green-700); font-size: 11px; font-weight: 800; }
        .educore-public-page .mock-body { display: grid; grid-template-columns: 145px 1fr; min-height: 393px; }
        .educore-public-page .mock-side { background: var(--navy-950); color: white; padding: 18px 14px; }
        .educore-public-page .mock-side .line { height: 10px; border-radius: 10px; background: rgba(255,255,255,.18); margin-bottom: 15px; }
        .educore-public-page .mock-side .active { background: linear-gradient(90deg, var(--gold-500), var(--green-500)); }
        .educore-public-page .mock-main { padding: 22px; background: linear-gradient(180deg, var(--cream-50), #fff); }
        .educore-public-page .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
        .educore-public-page .stat { border-radius: 18px; padding: 14px; background: white; border: 1px solid var(--stone-200); box-shadow: var(--shadow-sm); }
        .educore-public-page .stat strong { display: block; color: var(--navy-950); font-size: 22px; letter-spacing: -.04em; }
        .educore-public-page .stat span { color: var(--stone-500); font-size: 11px; font-weight: 700; }
        .educore-public-page .timeline { border-radius: 20px; background: white; border: 1px solid var(--stone-200); box-shadow: var(--shadow-sm); padding: 14px; }
        .educore-public-page .timeline-item { display: grid; grid-template-columns: 28px 1fr; gap: 10px; padding: 12px 0; border-bottom: 1px solid rgba(229,222,208,.7); }
        .educore-public-page .timeline-item:last-child { border-bottom: 0; }
        .educore-public-page .timeline-icon { width: 28px; height: 28px; border-radius: 50%; background: rgba(47,138,112,.12); }
        .educore-public-page .timeline-title { height: 10px; width: 72%; border-radius: 8px; background: var(--navy-900); opacity: .86; margin-bottom: 8px; }
        .educore-public-page .timeline-sub { height: 8px; width: 48%; border-radius: 8px; background: var(--stone-200); }
        .educore-public-page section { padding: 64px 0; }
        .educore-public-page .section-head { max-width: 760px; margin: 0 auto 34px; text-align: center; }
        .educore-public-page .section-kicker { color: var(--gold-600); text-transform: uppercase; font-size: 12px; letter-spacing: .14em; font-weight: 900; margin-bottom: 12px; }
        .educore-public-page .section-head h2 { margin: 0; color: var(--navy-950); font-size: clamp(34px, 4vw, 52px); line-height: 1.04; letter-spacing: -.055em; }
        .educore-public-page .section-head p { margin: 18px auto 0; color: var(--stone-700); font-size: 17px; line-height: 1.7; }
        .educore-public-page .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .educore-public-page .feature-card,
        .educore-public-page .module-panel,
        .educore-public-page .module-card,
        .educore-public-page .security-card,
        .educore-public-page .brand-note {
          background: white;
          border: 1px solid var(--stone-200);
          box-shadow: var(--shadow-sm);
        }
        .educore-public-page .feature-card {
          padding: 22px;
          border-radius: var(--radius-lg);
        }
        .educore-public-page .feature-icon {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(210,166,87,.16), rgba(47,138,112,.13));
          margin-bottom: 18px;
          color: var(--green-700);
          font-weight: 900;
        }
        .educore-public-page .feature-card h3 { margin: 0 0 8px; font-size: 18px; letter-spacing: -.03em; color: var(--navy-950); }
        .educore-public-page .feature-card p { margin: 0; color: var(--stone-700); line-height: 1.62; font-size: 14px; }
        .educore-public-page .solution-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 24px; align-items: stretch; }
        .educore-public-page .module-panel {
          border-radius: var(--radius-xl);
          padding: 30px;
          transition: transform 260ms cubic-bezier(.22, 1, .36, 1), box-shadow 260ms ease, border-color 260ms ease;
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
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
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
        .educore-public-page .module-card { border-radius: 20px; padding: 20px; position: relative; overflow: hidden; transition: transform 260ms cubic-bezier(.22, 1, .36, 1), box-shadow 260ms ease, border-color 260ms ease; }
        .educore-public-page .module-card::before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(47,138,112,.08), rgba(210,166,87,.08)); opacity: 0; transition: opacity 260ms ease; pointer-events: none; }
        .educore-public-page .module-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-md); border-color: rgba(47,138,112,.22); }
        .educore-public-page .module-card:hover::before { opacity: 1; }
        .educore-public-page .module-card > * { position: relative; }
        .educore-public-page .module-card strong { display: block; color: var(--navy-950); margin-bottom: 7px; letter-spacing: -.03em; }
        .educore-public-page .module-card span { color: var(--stone-700); font-size: 13px; line-height: 1.55; }
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
          transition: transform 320ms cubic-bezier(.22, 1, .36, 1), box-shadow 320ms ease, border-color 320ms ease;
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
          animation: landing-corium-breathe 6400ms ease-in-out infinite;
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
          transition: .2s ease;
        }
        .educore-public-page .access-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-premium); border-color: rgba(47,138,112,.22); }
        .educore-public-page .access-card strong { display: block; color: var(--navy-950); font-size: 18px; letter-spacing: -.03em; margin-bottom: 6px; }
        .educore-public-page .access-card span { color: var(--stone-700); font-size: 14px; line-height: 1.55; }
        .educore-public-page .dark-band {
          background: var(--navy-950);
          color: white;
          position: relative;
        }
        .educore-public-page .dark-band::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 20%, rgba(210,166,87,.22), transparent 34%), radial-gradient(circle at 82% 70%, rgba(47,138,112,.25), transparent 36%);
          pointer-events: none;
        }
        .educore-public-page .dark-band .container { position: relative; }
        .educore-public-page .dark-band .section-kicker { color: var(--gold-300); }
        .educore-public-page .dark-band h2 { color: white; }
        .educore-public-page .dark-band .section-head p { color: rgba(255,255,255,.72); }
        .educore-public-page .roles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .educore-public-page .role-card {
          padding: 22px;
          min-height: 190px;
          border-radius: var(--radius-xl);
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          backdrop-filter: blur(12px);
          transition: transform 260ms ease, background 260ms ease, border-color 260ms ease;
        }
        .educore-public-page .role-card:hover { transform: translateY(-4px); background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.2); }
        .educore-public-page .role-card h3 { margin: 0 0 10px; font-size: 21px; letter-spacing: -.04em; }
        .educore-public-page .role-card p { margin: 0 0 18px; color: rgba(255,255,255,.72); line-height: 1.58; font-size: 14px; }
        .educore-public-page .role-list { display: flex; flex-wrap: wrap; gap: 8px; color: rgba(255,255,255,.9); font-size: 12px; font-weight: 700; }
        .educore-public-page .role-list span { border-radius: 999px; background: rgba(255,255,255,.1); padding: 6px 9px; }
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
          transition: transform 320ms cubic-bezier(.22, 1, .36, 1), box-shadow 320ms ease;
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
        .educore-public-page .security-card { padding: 24px; border-radius: var(--radius-lg); transition: transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease; }
        .educore-public-page .security-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: rgba(47,138,112,.18); }
        .educore-public-page .security-card strong { display: block; margin-bottom: 8px; color: var(--navy-950); }
        .educore-public-page .security-card span { color: var(--stone-700); font-size: 14px; line-height: 1.6; }
        .educore-public-page .cta { padding: 64px 0 82px; }
        .educore-public-page .cta-card { text-align: center; border-radius: 38px; padding: 54px 34px; background: white; border: 1px solid var(--stone-200); box-shadow: var(--shadow-md); transition: transform 320ms ease, box-shadow 320ms ease, border-color 320ms ease; }
        .educore-public-page .cta-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-premium); border-color: rgba(47,138,112,.16); }
        .educore-public-page .cta-card h2 { margin: 0; font-size: clamp(36px, 5vw, 58px); letter-spacing: -.06em; color: var(--navy-950); }
        .educore-public-page .cta-card p { max-width: 650px; margin: 18px auto 30px; color: var(--stone-700); font-size: 17px; line-height: 1.7; }
        .educore-public-page footer { padding: 30px 0 42px; color: var(--stone-500); font-size: 13px; }
        .educore-public-page .footer-inner { display: flex; justify-content: space-between; gap: 20px; align-items: center; border-top: 1px solid var(--stone-200); padding-top: 24px; }
        @media (max-width: 980px) {
          .educore-public-page .nav-links { display: none; }
          .educore-public-page .hero-grid,
          .educore-public-page .solution-grid,
          .educore-public-page .corium-card,
          .educore-public-page .app-card,
          .educore-public-page .access-grid { grid-template-columns: 1fr; }
          .educore-public-page .features,
          .educore-public-page .module-list,
          .educore-public-page .roles,
          .educore-public-page .security { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .educore-public-page .container { width: min(100% - 28px, var(--max)); }
          .educore-public-page .nav-inner { height: 68px; }
          .educore-public-page .brand-logo { width: 132px; }
          .educore-public-page .nav-actions .btn-soft { display: none; }
          .educore-public-page .hero { padding: 54px 0 60px; }
          .educore-public-page .product-card { padding: 10px; border-radius: 26px; }
          .educore-public-page .mock-body { grid-template-columns: 1fr; }
          .educore-public-page .mock-side { display: none; }
          .educore-public-page .features,
          .educore-public-page .module-list,
          .educore-public-page .corium-points,
          .educore-public-page .roles,
          .educore-public-page .security { grid-template-columns: 1fr; }
          .educore-public-page .brand-note,
          .educore-public-page .access-card { align-items: flex-start; flex-direction: column; }
          .educore-public-page .app-card { padding: 30px 22px; border-radius: 28px; }
          .educore-public-page .footer-inner { flex-direction: column; align-items: flex-start; }
          .educore-public-page .contextual-corium {
            left: 14px;
            right: 14px;
            bottom: 14px;
            justify-content: flex-start;
            border-radius: 22px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .educore-public-page .landing-reveal,
          .educore-public-page .landing-reveal.is-visible,
          .educore-public-page .product-card,
          .educore-public-page .module-panel,
          .educore-public-page .solution-item,
          .educore-public-page .module-card,
          .educore-public-page .corium-card,
          .educore-public-page .corium-mascot,
          .educore-public-page .contextual-corium,
          .educore-public-page .contextual-corium-avatar,
          .educore-public-page .access-card,
          .educore-public-page .role-card,
          .educore-public-page .app-card,
          .educore-public-page .security-card,
          .educore-public-page .cta-card,
          .educore-public-page .btn,
          .educore-public-page .hero::before {
            animation: none;
            transform: none;
            transition: none;
          }
          .educore-public-page .landing-reveal { opacity: 1; }
        }
        @keyframes landing-soft-light {
          from { transform: translate3d(0, 0, 0) scale(1); opacity: .9; }
          to { transform: translate3d(-22px, 18px, 0) scale(1.04); opacity: 1; }
        }
        @keyframes landing-corium-in {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes landing-corium-breathe {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 18px 30px rgba(15,23,42,.10)); }
          50% { transform: translateY(-3px) scale(1.012); filter: drop-shadow(0 22px 34px rgba(47,138,112,.16)); }
        }
      `}</style>

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
          </nav>
          <div className="nav-actions">
            <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            <Link className="btn btn-primary" href="/experience">Probar EducaCora</Link>
          </div>
        </div>
      </header>

      <section className="hero" data-corium-message="Bienvenido a EducaCora.">
        <div className="container hero-grid">
          <div className="landing-reveal">
            <div className="eyebrow">● El corazón de tu centro educativo.</div>
            <h1>EducaCora conecta toda la <span className="gradient">comunidad educativa</span>.</h1>
            <p>Una plataforma escolar inteligente y centralizada para dirección, docentes y familias.</p>
            <div className="hero-actions landing-reveal landing-delay-4">
              <Link className="btn btn-primary" href="/experience">Probar EducaCora</Link>
              <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            </div>
            <div className="trust-row landing-reveal landing-delay-4">
              <span>Dirección</span><span className="trust-dot" />
              <span>Docentes</span><span className="trust-dot" />
              <span>Familias</span><span className="trust-dot" />
              <span>Alumnos</span>
            </div>
          </div>

          <div className="product-card landing-reveal landing-delay-3" aria-label="Vista conceptual de EducaCora">
            <div className="mock-screen">
              <div className="mock-top">
                <div className="brand" style={{ gap: 8 }}>
                  <Image className="brand-icon" src="/brand/educore/icon.svg" alt="" width={256} height={256} style={{ width: 28, height: 28 }} />
                  <span className="mock-title">EducaCora Control Center</span>
                </div>
                <span className="mock-badge">Centro activo</span>
              </div>
              <div className="mock-body">
                <aside className="mock-side" aria-hidden="true">
                  <div className="line active" style={{ width: "84%" }} />
                  <div className="line" style={{ width: "64%" }} />
                  <div className="line" style={{ width: "78%" }} />
                  <div className="line" style={{ width: "58%" }} />
                  <div className="line" style={{ width: "72%" }} />
                </aside>
                <div className="mock-main">
                  <div className="stat-grid">
                    <div className="stat"><strong>98%</strong><span>Asistencia</span></div>
                    <div className="stat"><strong>24</strong><span>Mensajes</span></div>
                    <div className="stat"><strong>7</strong><span>Evaluaciones</span></div>
                  </div>
                  <div className="timeline">
                    <div className="timeline-item"><div className="timeline-icon" /><div><div className="timeline-title" /><div className="timeline-sub" /></div></div>
                    <div className="timeline-item"><div className="timeline-icon" style={{ background: "rgba(210,166,87,.18)" }} /><div><div className="timeline-title" style={{ width: "64%" }} /><div className="timeline-sub" style={{ width: "58%" }} /></div></div>
                    <div className="timeline-item"><div className="timeline-icon" /><div><div className="timeline-title" style={{ width: "79%" }} /><div className="timeline-sub" style={{ width: "44%" }} /></div></div>
                    <div className="timeline-item"><div className="timeline-icon" style={{ background: "rgba(210,166,87,.18)" }} /><div><div className="timeline-title" style={{ width: "54%" }} /><div className="timeline-sub" style={{ width: "62%" }} /></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="acceso" data-corium-message="Accede a tu centro o prueba la Experience.">
        <div className="container access-grid">
          <div className="module-panel landing-reveal">
            <div className="section-kicker">Centros conectados</div>
            <h3>Accede a tu centro educativo</h3>
            <p>Selecciona el centro al que perteneces para acceder a tu plataforma EducaCora.</p>
          </div>
          <div className="module-list landing-reveal landing-delay-1" style={{ gridTemplateColumns: "1fr" }}>
            {schools.map((school) => (
              <Link className="access-card" href={school.href} key={school.name}>
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
          <div className="module-panel landing-reveal">
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

      <section id="modulos" data-corium-message="Aquí trabajan los centros educativos cada día.">
        <div className="container">
          <div className="section-head landing-reveal">
            <div className="section-kicker">Módulos principales</div>
            <h2>Todo conectado, sin duplicar trabajo.</h2>
            <p>Los módulos clave trabajan conectados y se adaptan a cada rol.</p>
          </div>
          <div className="module-list landing-reveal landing-delay-1">
            {modules.map(([title, description]) => (
              <article className="module-card" key={title}>
                <strong>{title}</strong>
                <span>{description}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="corium-ai" data-corium-message="Corium acompaña sin invadir.">
        <div className="container">
          <div className="corium-card landing-reveal">
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

      <section className="dark-band" id="roles" data-corium-message="Cada rol ve lo que necesita.">
        <div className="container">
          <div className="section-head landing-reveal">
            <div className="section-kicker">Roles</div>
            <h2>Una plataforma, cuatro experiencias.</h2>
            <p>La misma base visual y funcional adaptada a las responsabilidades reales de cada perfil.</p>
          </div>
          <div className="roles landing-reveal landing-delay-1">
            <article className="role-card"><h3>Dirección</h3><p>Supervisa actividad, prioridades, evaluación e incidencias.</p><div className="role-list"><span>Centro de control</span><span>Prioridades</span></div></article>
            <article className="role-card"><h3>Docentes</h3><p>Gestionan asistencia, cuaderno, alumnos y comunicaciones.</p><div className="role-list"><span>Cuaderno</span><span>Mis alumnos</span></div></article>
            <article className="role-card"><h3>Familias</h3><p>Consultan notas visibles, boletines y mensajes del centro.</p><div className="role-list"><span>Boletines</span><span>Comunicación</span></div></article>
            <article className="role-card"><h3>Administración</h3><p>Mantiene usuarios, estructura, importaciones y seguridad.</p><div className="role-list"><span>Mantenimiento</span><span>Roles</span></div></article>
          </div>
        </div>
      </section>

      <section id="experience" data-corium-message="Pruébalo como un centro real.">
        <div className="container brand-note landing-reveal">
          <Image src="/brand/educore/logo.svg" alt="EducaCora" width={512} height={150} style={{ width: 178, height: "auto" }} />
          <p>EducaCora Experience no es un vídeo ni una galería de capturas. Es el producto real funcionando con datos ficticios para Dirección, Docentes y Familias.</p>
          <Link className="btn btn-primary" href="/experience">Probar EducaCora</Link>
        </div>
      </section>

      <section className="app-section" id="app" data-corium-message="Lleva EducaCora siempre contigo.">
        <div className="container app-card landing-reveal">
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
            <div className="security-card"><strong>Roles claros</strong><span>Dirección, docentes, administración y familias con experiencias y permisos diferenciados.</span></div>
            <div className="security-card"><strong>Datos visibles según permisos</strong><span>Cada usuario accede únicamente a la información que le corresponde.</span></div>
            <div className="security-card"><strong>Preparado para RGPD</strong><span>Arquitectura pensada para trazabilidad, control de acceso y evolución segura.</span></div>
          </div>
        </div>
      </section>

      <section className="cta" id="demo" data-corium-message="¿Quieres verlo funcionando?">
        <div className="container">
          <div className="cta-card landing-reveal">
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

      <footer>
        <div className="container footer-inner">
          <Image src="/brand/educore/logo.svg" alt="EducaCora" width={512} height={150} style={{ width: 132, height: "auto" }} />
          <div>© 2026 EducaCora · El corazón de tu centro educativo.</div>
        </div>
      </footer>
    </main>
  );
}
