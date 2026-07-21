import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { ExperienceRoleSelector } from "@/components/experience/experience-role-selector";
import { experienceWelcomeGuide } from "@/lib/experience/guide-content";

export const metadata: Metadata = {
  title: "EducaCora Experience | Prueba la plataforma",
  description: "Explora EducaCora con datos ficticios desde los perfiles de dirección, docente y familia.",
  alternates: {
    canonical: "/experience"
  }
};

export default function ExperiencePage() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-slate-950">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/brand/educore/logo.svg" alt="EducaCora" width={512} height={150} className="h-auto w-44" priority />
          </Link>
          <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Volver a la web
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <div className="experience-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Entorno demo aislado
          </div>
          <h1 className="experience-fade-up experience-delay-1 mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl">
            Prueba EducaCora como si estuvieras dentro de un centro.
          </h1>
          <p className="experience-fade-up experience-delay-2 mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            EducaCora Experience utiliza datos ficticios y acciones simuladas. No accede a Supabase, no requiere login y no conserva cambios al recargar.
          </p>
          <div className="experience-fade-up experience-delay-3 mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Sin datos reales</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Acceso directo</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Se reinicia al recargar</span>
          </div>
        </div>

        <div className="experience-fade-up experience-delay-2 rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,27,46,.12)]">
          <div className="rounded-[28px] bg-[#f6f3ec] p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <CoriumAvatar variant="waving" className="experience-corium-glow h-32 w-28 object-contain" priority />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700">Corium AI</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{experienceWelcomeGuide.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {experienceWelcomeGuide.message}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-950">{experienceWelcomeGuide.question}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/experience/director?guide=1" className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    Empezar guía
                  </Link>
                  <a href="#experience-roles" className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    Explorar por mi cuenta
                  </a>
                </div>
              </div>
            </div>
          </div>

          <ExperienceRoleSelector />

          <div className="experience-fade-up experience-delay-4 mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
            Las acciones se simulan en el navegador. Al recargar, la Experience vuelve a su estado inicial.
          </div>
        </div>
      </section>
    </main>
  );
}
