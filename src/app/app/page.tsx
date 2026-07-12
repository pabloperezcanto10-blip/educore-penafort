import Image from "next/image";
import type { Metadata } from "next";
import { ContactTrigger } from "@/components/contact/contact-modal";
import { EduCoreCenterLauncher } from "@/components/pwa/educore-center-launcher";

export const metadata: Metadata = {
  title: "EducaCora | Selecciona tu centro educativo",
  description: "Accede a la plataforma de tu colegio desde EducaCora.",
  alternates: {
    canonical: "/app"
  },
  robots: {
    index: false,
    follow: false
  }
};

const centers = [
  {
    id: "colegio-penafort",
    name: "Colegio Peñafort",
    location: "Alicante",
    verified: true,
    href: "/login"
  }
];

export default function EduCoreAppLauncherPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EC] px-5 py-6 text-[#0F1B2E] sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col items-center justify-center">
        <div className="w-full rounded-[34px] border border-[#E7EBEE] bg-white/94 p-6 shadow-[0_24px_80px_rgba(15,27,46,0.12)] sm:p-12">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/brand/educore/logo-vertical.svg"
              alt="EducaCora"
              width={320}
              height={320}
              priority
              className="h-auto w-56 sm:w-64"
            />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#2F8A70]">
              El corazón de tu centro educativo.
            </p>
            <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-[#0F1B2E] sm:text-5xl">
              Selecciona tu centro educativo
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4E5B61]">
              Accede a la plataforma de tu colegio desde EducaCora.
            </p>
          </div>

          <EduCoreCenterLauncher centers={centers} />

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-[#6B737C]">¿Tu centro aún no utiliza EducaCora?</p>
            <ContactTrigger
              origin="pwa_launcher"
              originLabel="Contacto desde PWA"
              className="mt-1 inline-flex text-sm font-semibold text-[#2F8A70] underline-offset-4 hover:underline"
            >
              Contactar →
            </ContactTrigger>
          </div>
        </div>
      </section>
    </main>
  );
}
