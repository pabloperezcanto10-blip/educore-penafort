import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";

const schools = [
  {
    name: "Colegio Peñafort",
    description: "Acceso a la plataforma EduCore del centro.",
    href: "/login"
  }
];

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return (
    <main className="educore-public-page">
      <style>{`
        .educore-public-page {
          --navy-950: #061f2a;
          --navy-900: #0b2b38;
          --navy-800: #123b48;
          --green-700: #1f6f5b;
          --green-600: #2f8a70;
          --green-500: #4aa486;
          --gold-600: #b9883d;
          --gold-500: #d2a657;
          --gold-300: #edd8a6;
          --cream-50: #fbf8f1;
          --cream-100: #f4efe3;
          --stone-900: #182025;
          --stone-700: #4e5b61;
          --stone-500: #7a8589;
          --stone-200: #e5ded0;
          --white: #ffffff;
          --shadow-sm: 0 10px 30px rgba(6, 31, 42, .08);
          --shadow-md: 0 18px 55px rgba(6, 31, 42, .13);
          --radius-xl: 28px;
          --radius-lg: 22px;
          --radius-md: 16px;
          --max: 1180px;
          min-height: 100vh;
          overflow: hidden;
          color: var(--stone-900);
          background: var(--cream-50);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .educore-public-page * { box-sizing: border-box; }
        .educore-public-page a { color: inherit; text-decoration: none; }
        .educore-public-page .container { width: min(var(--max), calc(100% - 40px)); margin: 0 auto; }
        .educore-public-page .brand { display: inline-flex; align-items: center; gap: 12px; }
        .educore-public-page .brand-logo { display: block; width: 168px; height: auto; }
        .educore-public-page .brand-icon {
          width: 42px;
          height: 42px;
          display: block;
          filter: drop-shadow(0 12px 18px rgba(47, 138, 112, .22));
        }
        .educore-public-page .brand-name { font-size: 23px; letter-spacing: -.04em; font-weight: 800; color: var(--navy-950); }
        .educore-public-page .brand-name span { color: var(--green-700); }
        .educore-public-page .nav {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(22px);
          background: rgba(251, 248, 241, .78);
          border-bottom: 1px solid rgba(229, 222, 208, .75);
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
        .educore-public-page .btn-primary { background: var(--navy-950); color: white; box-shadow: 0 16px 35px rgba(6, 31, 42, .22); }
        .educore-public-page .btn-primary:hover { transform: translateY(-1px); background: var(--navy-800); }
        .educore-public-page .btn-soft { background: rgba(255,255,255,.72); color: var(--navy-950); border-color: var(--stone-200); }
        .educore-public-page .btn-soft:hover { background: white; transform: translateY(-1px); }
        .educore-public-page .btn-gold { background: linear-gradient(135deg, var(--gold-500), var(--green-600)); color: white; box-shadow: 0 16px 35px rgba(185, 136, 61, .28); }
        .educore-public-page .hero {
          position: relative;
          padding: 86px 0 92px;
        }
        .educore-public-page .hero::before {
          content: "";
          position: absolute;
          inset: -180px -160px auto auto;
          width: 620px;
          height: 620px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(210,166,87,.28), rgba(47,138,112,.1) 42%, transparent 68%);
          pointer-events: none;
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
        .educore-public-page .hero-actions { display: flex; align-items: center; gap: 14px; margin-top: 34px; flex-wrap: wrap; }
        .educore-public-page .trust-row { display: flex; align-items: center; gap: 22px; margin-top: 34px; color: var(--stone-500); font-size: 13px; font-weight: 700; }
        .educore-public-page .trust-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold-500); }
        .educore-public-page .product-card {
          position: relative;
          border-radius: 34px;
          padding: 18px;
          background: linear-gradient(145deg, rgba(255,255,255,.92), rgba(244,239,227,.68));
          border: 1px solid rgba(255,255,255,.8);
          box-shadow: var(--shadow-md);
        }
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
          min-height: 515px;
          overflow: hidden;
        }
        .educore-public-page .mock-top { height: 62px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; border-bottom: 1px solid var(--stone-200); }
        .educore-public-page .mock-title { font-size: 13px; font-weight: 800; color: var(--navy-950); }
        .educore-public-page .mock-badge { padding: 6px 10px; border-radius: 999px; background: rgba(47,138,112,.1); color: var(--green-700); font-size: 11px; font-weight: 800; }
        .educore-public-page .mock-body { display: grid; grid-template-columns: 145px 1fr; min-height: 453px; }
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
        .educore-public-page section { padding: 86px 0; }
        .educore-public-page .section-head { max-width: 760px; margin: 0 auto 42px; text-align: center; }
        .educore-public-page .section-kicker { color: var(--gold-600); text-transform: uppercase; font-size: 12px; letter-spacing: .14em; font-weight: 900; margin-bottom: 12px; }
        .educore-public-page .section-head h2 { margin: 0; color: var(--navy-950); font-size: clamp(34px, 4vw, 52px); line-height: 1.04; letter-spacing: -.055em; }
        .educore-public-page .section-head p { margin: 18px auto 0; color: var(--stone-700); font-size: 17px; line-height: 1.7; }
        .educore-public-page .features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .educore-public-page .feature-card {
          padding: 26px;
          border-radius: var(--radius-lg);
          background: white;
          border: 1px solid var(--stone-200);
          box-shadow: var(--shadow-sm);
        }
        .educore-public-page .feature-icon {
          width: 45px;
          height: 45px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(210,166,87,.16), rgba(47,138,112,.13));
          margin-bottom: 20px;
          color: var(--green-700);
          font-weight: 900;
        }
        .educore-public-page .feature-card h3 { margin: 0 0 10px; font-size: 18px; letter-spacing: -.03em; color: var(--navy-950); }
        .educore-public-page .feature-card p { margin: 0; color: var(--stone-700); line-height: 1.65; font-size: 14px; }
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
        .educore-public-page .roles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .educore-public-page .role-card {
          padding: 24px;
          min-height: 260px;
          border-radius: var(--radius-xl);
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          backdrop-filter: blur(12px);
        }
        .educore-public-page .role-card h3 { margin: 0 0 12px; font-size: 21px; letter-spacing: -.04em; }
        .educore-public-page .role-card p { margin: 0 0 22px; color: rgba(255,255,255,.7); line-height: 1.65; font-size: 14px; }
        .educore-public-page .role-list { display: grid; gap: 9px; color: rgba(255,255,255,.86); font-size: 13px; font-weight: 600; }
        .educore-public-page .modules-wrap { display: grid; grid-template-columns: .82fr 1.18fr; gap: 28px; align-items: stretch; }
        .educore-public-page .module-panel {
          border-radius: var(--radius-xl);
          padding: 34px;
          background: white;
          border: 1px solid var(--stone-200);
          box-shadow: var(--shadow-sm);
        }
        .educore-public-page .module-panel h3 { margin: 0; color: var(--navy-950); font-size: 31px; letter-spacing: -.05em; }
        .educore-public-page .module-panel p { color: var(--stone-700); line-height: 1.72; margin: 14px 0 0; }
        .educore-public-page .module-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .educore-public-page .module-card { background: white; border: 1px solid var(--stone-200); border-radius: 20px; padding: 20px; box-shadow: var(--shadow-sm); }
        .educore-public-page .module-card strong { display: block; color: var(--navy-950); margin-bottom: 7px; letter-spacing: -.03em; }
        .educore-public-page .module-card span { color: var(--stone-700); font-size: 13px; line-height: 1.55; }
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
        .educore-public-page .access-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .educore-public-page .access-card strong { display: block; color: var(--navy-950); font-size: 18px; letter-spacing: -.03em; margin-bottom: 6px; }
        .educore-public-page .access-card span { color: var(--stone-700); font-size: 14px; line-height: 1.55; }
        .educore-public-page .brand-system { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: stretch; }
        .educore-public-page .brand-board { background: white; border: 1px solid var(--stone-200); border-radius: var(--radius-xl); padding: 30px; box-shadow: var(--shadow-sm); }
        .educore-public-page .brand-board h3 { margin: 0 0 18px; color: var(--navy-950); letter-spacing: -.04em; font-size: 24px; }
        .educore-public-page .logo-showcase { min-height: 260px; display: grid; place-items: center; border-radius: 24px; background: linear-gradient(135deg, var(--cream-50), white); border: 1px dashed var(--stone-200); }
        .educore-public-page .palette { display: grid; gap: 12px; }
        .educore-public-page .swatch { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: center; }
        .educore-public-page .swatch-color { height: 44px; border-radius: 14px; border: 1px solid rgba(0,0,0,.06); }
        .educore-public-page .swatch strong { display: block; font-size: 13px; color: var(--navy-950); }
        .educore-public-page .swatch span { font-size: 12px; color: var(--stone-500); font-weight: 700; }
        .educore-public-page .app-section { background: linear-gradient(180deg, white, var(--cream-50)); }
        .educore-public-page .app-card {
          border-radius: 36px;
          background: linear-gradient(135deg, var(--navy-950), var(--navy-800));
          color: white;
          padding: 44px;
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 34px;
          align-items: center;
          box-shadow: var(--shadow-md);
          overflow: hidden;
          position: relative;
        }
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
        .educore-public-page .app-card p { color: rgba(255,255,255,.72); line-height: 1.7; font-size: 17px; }
        .educore-public-page .device {
          width: 250px;
          height: 430px;
          margin: 0 auto;
          border-radius: 42px;
          background: #0c1620;
          padding: 12px;
          box-shadow: 0 35px 60px rgba(0,0,0,.35);
        }
        .educore-public-page .device-screen {
          height: 100%;
          border-radius: 32px;
          background: var(--cream-50);
          padding: 20px;
          color: var(--navy-950);
        }
        .educore-public-page .device-icon { display: block; margin: 22px auto 12px; width: 58px; height: 58px; }
        .educore-public-page .device-card { background: white; border-radius: 20px; padding: 16px; box-shadow: var(--shadow-sm); margin-top: 16px; }
        .educore-public-page .device-line { height: 9px; border-radius: 999px; background: var(--stone-200); margin: 11px 0; }
        .educore-public-page .device-line.green { background: linear-gradient(90deg, var(--green-600), var(--gold-500)); width: 70%; }
        .educore-public-page .security { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .educore-public-page .security-card { padding: 26px; border-radius: var(--radius-lg); background: white; border: 1px solid var(--stone-200); box-shadow: var(--shadow-sm); }
        .educore-public-page .security-card strong { display: block; margin-bottom: 8px; color: var(--navy-950); }
        .educore-public-page .security-card span { color: var(--stone-700); font-size: 14px; line-height: 1.6; }
        .educore-public-page .cta { padding: 80px 0 96px; }
        .educore-public-page .cta-card { text-align: center; border-radius: 38px; padding: 62px 34px; background: white; border: 1px solid var(--stone-200); box-shadow: var(--shadow-md); }
        .educore-public-page .cta-card h2 { margin: 0; font-size: clamp(36px, 5vw, 58px); letter-spacing: -.06em; color: var(--navy-950); }
        .educore-public-page .cta-card p { max-width: 650px; margin: 18px auto 30px; color: var(--stone-700); font-size: 17px; line-height: 1.7; }
        .educore-public-page footer { padding: 32px 0 46px; color: var(--stone-500); font-size: 13px; }
        .educore-public-page .footer-inner { display: flex; justify-content: space-between; gap: 20px; align-items: center; border-top: 1px solid var(--stone-200); padding-top: 26px; }
        @media (max-width: 980px) {
          .educore-public-page .nav-links { display: none; }
          .educore-public-page .hero-grid,
          .educore-public-page .modules-wrap,
          .educore-public-page .brand-system,
          .educore-public-page .app-card,
          .educore-public-page .access-grid { grid-template-columns: 1fr; }
          .educore-public-page .features,
          .educore-public-page .roles,
          .educore-public-page .security { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .educore-public-page .container { width: min(100% - 28px, var(--max)); }
          .educore-public-page .nav-inner { height: 68px; }
          .educore-public-page .brand-logo { width: 132px; }
          .educore-public-page .nav-actions .btn-soft { display: none; }
          .educore-public-page .hero { padding: 58px 0 70px; }
          .educore-public-page .product-card { padding: 10px; border-radius: 26px; }
          .educore-public-page .mock-body { grid-template-columns: 1fr; }
          .educore-public-page .mock-side { display: none; }
          .educore-public-page .features,
          .educore-public-page .roles,
          .educore-public-page .module-list,
          .educore-public-page .security { grid-template-columns: 1fr; }
          .educore-public-page .app-card { padding: 30px 22px; border-radius: 28px; }
          .educore-public-page .access-card { align-items: flex-start; flex-direction: column; }
          .educore-public-page .footer-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href="/">
            <Image className="brand-logo" src="/brand/educore/logo.svg" alt="EduCore" width={220} height={56} priority />
          </Link>
          <nav className="nav-links" aria-label="Principal">
            <a href="#modulos">Módulos</a>
            <a href="#roles">Roles</a>
            <a href="#marca">Marca</a>
            <a href="#app">App</a>
            <a href="#seguridad">Seguridad</a>
          </nav>
          <div className="nav-actions">
            <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            <a className="btn btn-primary" href="#demo">Solicitar demo</a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">● El corazón de tu centro</div>
            <h1>EduCore conecta toda la <span className="gradient">comunidad educativa</span>.</h1>
            <p>Una plataforma escolar inteligente, elegante y centralizada para coordinar dirección, docentes, familias y alumnos desde un único lugar.</p>
            <div className="hero-actions">
              <a className="btn btn-gold" href="#demo">Solicitar una demo</a>
              <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            </div>
            <div className="trust-row">
              <span>Dirección</span><span className="trust-dot" />
              <span>Docentes</span><span className="trust-dot" />
              <span>Familias</span><span className="trust-dot" />
              <span>Alumnos</span>
            </div>
          </div>

          <div className="product-card" aria-label="Vista conceptual de EduCore">
            <div className="mock-screen">
              <div className="mock-top">
                <div className="brand" style={{ gap: 8 }}>
                  <Image className="brand-icon" src="/brand/educore/icon.svg" alt="" width={42} height={42} style={{ width: 28, height: 28 }} />
                  <span className="mock-title">EduCore Control Center</span>
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

      <section id="modulos">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Producto</div>
            <h2>Un motor común para todo el centro.</h2>
            <p>EduCore organiza el trabajo diario del colegio con módulos visuales, conectados y pensados para reducir ruido operativo.</p>
          </div>
          <div className="features">
            <article className="feature-card"><div className="feature-icon">01</div><h3>Comunicación</h3><p>Conversaciones entre familias, docentes y dirección con seguimiento, estados y trazabilidad.</p></article>
            <article className="feature-card"><div className="feature-icon">02</div><h3>Cuaderno</h3><p>Calificaciones, observaciones, criterios y boletines conectados con datos reales.</p></article>
            <article className="feature-card"><div className="feature-icon">03</div><h3>Asistencia</h3><p>Pasar lista de forma rápida, visual y preparada para seguimiento por roles.</p></article>
            <article className="feature-card"><div className="feature-icon">04</div><h3>Supervisión</h3><p>Dashboards vivos para entender qué ocurre en el centro en segundos.</p></article>
          </div>
        </div>
      </section>

      <section className="dark-band" id="roles">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Roles</div>
            <h2>Una experiencia distinta para cada miembro de la comunidad.</h2>
            <p>La misma plataforma, adaptada a las responsabilidades reales de cada perfil.</p>
          </div>
          <div className="roles">
            <article className="role-card"><h3>Dirección</h3><p>Centro de control para supervisar comunicaciones, evaluación, incidencias y actividad del colegio.</p><div className="role-list"><span>Centro de actividad</span><span>Prioridades</span><span>Supervisión académica</span></div></article>
            <article className="role-card"><h3>Docentes</h3><p>Un espacio operativo para pasar lista, calificar, comunicar y seguir a cada alumno.</p><div className="role-list"><span>Cuaderno</span><span>Mis alumnos</span><span>Horario y asistencia</span></div></article>
            <article className="role-card"><h3>Familias</h3><p>Información clara sobre calificaciones, boletines, comunicaciones y evolución del alumno.</p><div className="role-list"><span>Notas visibles</span><span>Boletines</span><span>Comunicación directa</span></div></article>
            <article className="role-card"><h3>Administración</h3><p>Gestión estructural del centro: usuarios, cursos, materias, importación y seguridad.</p><div className="role-list"><span>Mantenimiento</span><span>Importación</span><span>Usuarios y roles</span></div></article>
          </div>
        </div>
      </section>

      <section>
        <div className="container modules-wrap">
          <div className="module-panel">
            <div className="section-kicker">Sistema modular</div>
            <h3>Todo conectado, sin duplicar trabajo.</h3>
            <p>EduCore está diseñado para que cada módulo común se implemente una vez y se adapte por permisos y rol. La mejora de un módulo se refleja en toda la plataforma.</p>
            <div style={{ marginTop: 24 }}><a className="btn btn-primary" href="#demo">Ver una demo</a></div>
          </div>
          <div className="module-list">
            <div className="module-card"><strong>Centro de control</strong><span>Timeline vivo con actividad del colegio y acciones contextualizadas.</span></div>
            <div className="module-card"><strong>Ficha del alumno</strong><span>Resumen académico, asistencia, incidencias, comunicaciones y seguimiento.</span></div>
            <div className="module-card"><strong>Boletines</strong><span>Vista previa y PDF profesional preparados para familias.</span></div>
            <div className="module-card"><strong>EduCore AI</strong><span>Asistente educativo integrado, preparado para fases con privacidad controlada.</span></div>
          </div>
        </div>
      </section>

      <section id="acceso">
        <div className="container access-grid">
          <div className="module-panel">
            <div className="section-kicker">Centros conectados</div>
            <h3>Accede a tu centro educativo</h3>
            <p>Selecciona el centro al que perteneces para acceder a tu plataforma EduCore.</p>
          </div>
          <div className="module-list" style={{ gridTemplateColumns: "1fr" }}>
            {schools.map((school) => (
              <Link className="access-card" href={school.href} key={school.name}>
                <div className="brand" style={{ gap: 14 }}>
                  <Image className="brand-icon" src="/brand/educore/icon.svg" alt="" width={42} height={42} />
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

      <section id="marca">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Identidad</div>
            <h2>Una marca pensada como el corazón del centro.</h2>
            <p>El corazón representa conexión, cuidado y coordinación. El verde aporta crecimiento y confianza. El dorado añade valor institucional y sofisticación.</p>
          </div>
          <div className="brand-system">
            <div className="brand-board">
              <h3>Logo principal</h3>
              <div className="logo-showcase">
                <div style={{ textAlign: "center" }}>
                  <Image src="/brand/educore/logo.svg" alt="EduCore" width={220} height={56} />
                  <div style={{ marginTop: 8, color: "var(--stone-500)", fontWeight: 700 }}>El corazón de tu centro</div>
                </div>
              </div>
            </div>
            <div className="brand-board">
              <h3>Paleta corporativa</h3>
              <div className="palette">
                <div className="swatch"><div className="swatch-color" style={{ background: "#061f2a" }} /><div><strong>Navy profundo</strong><span>#061F2A · Confianza y tecnología</span></div></div>
                <div className="swatch"><div className="swatch-color" style={{ background: "#2f8a70" }} /><div><strong>Verde EduCore</strong><span>#2F8A70 · Crecimiento y comunidad</span></div></div>
                <div className="swatch"><div className="swatch-color" style={{ background: "#d2a657" }} /><div><strong>Dorado institucional</strong><span>#D2A657 · Valor y excelencia</span></div></div>
                <div className="swatch"><div className="swatch-color" style={{ background: "#fbf8f1" }} /><div><strong>Blanco cálido</strong><span>#FBF8F1 · Claridad y cercanía</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-section" id="app">
        <div className="container app-card">
          <div>
            <div className="section-kicker" style={{ color: "var(--gold-300)" }}>App instalable</div>
            <h2>EduCore también puede vivir en el móvil, tablet u ordenador.</h2>
            <p>Preparado para convertirse en una app instalable tipo PWA, con icono propio, experiencia standalone y acceso rápido para docentes, familias y dirección.</p>
            <div className="hero-actions"><a className="btn btn-gold" href="#demo">Solicitar demo</a><a className="btn btn-soft" href="#acceso">Acceder a centro</a></div>
          </div>
          <div className="device" aria-hidden="true">
            <div className="device-screen">
              <Image className="device-icon" src="/brand/educore/icon.svg" alt="" width={58} height={58} />
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 24, letterSpacing: "-.04em" }}>EduCore</div>
              <div className="device-card"><strong>Buenos días</strong><div className="device-line green" /><div className="device-line" /><div className="device-line" style={{ width: "82%" }} /></div>
              <div className="device-card"><strong>Actividad</strong><div className="device-line" /><div className="device-line" style={{ width: "72%" }} /><div className="device-line" style={{ width: "46%" }} /></div>
            </div>
          </div>
        </div>
      </section>

      <section id="seguridad">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Confianza</div>
            <h2>Seguridad, permisos y privacidad desde el diseño.</h2>
            <p>EduCore separa roles, permisos y visibilidad para que cada usuario vea únicamente lo que le corresponde.</p>
          </div>
          <div className="security">
            <div className="security-card"><strong>Roles claros</strong><span>Dirección, docentes, administración y familias con experiencias y permisos diferenciados.</span></div>
            <div className="security-card"><strong>Datos visibles</strong><span>Las familias solo acceden a calificaciones, observaciones y boletines publicados o visibles.</span></div>
            <div className="security-card"><strong>Preparado para RGPD</strong><span>Arquitectura pensada para trazabilidad, control de acceso y evolución segura.</span></div>
          </div>
        </div>
      </section>

      <section className="cta" id="demo">
        <div className="container">
          <div className="cta-card">
            <div className="eyebrow">EduCore SaaS educativo</div>
            <h2>Convierte tu centro en una comunidad conectada.</h2>
            <p>Solicita una demo y descubre cómo EduCore puede centralizar comunicación, evaluación, asistencia y supervisión en una única plataforma.</p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <a className="btn btn-gold" href="mailto:demo@educore.es">Solicitar una demo</a>
              <a className="btn btn-soft" href="#acceso">Accede a tu centro</a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <Image src="/brand/educore/logo.svg" alt="EduCore" width={132} height={34} />
          <div>© 2026 EduCore · El corazón de tu centro educativo.</div>
        </div>
      </footer>
    </main>
  );
}
