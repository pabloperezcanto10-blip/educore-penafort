import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react";
import { SchoolLogo } from "@/components/branding/school-logo";
import {
  PUBLIC_SCHOOLS,
  getPublicSchoolLoginPath
} from "@/lib/schools/public-schools";

export const metadata: Metadata = {
  title: "Acceso a centros | EducaCora",
  description: "Selecciona tu centro educativo para acceder a EducaCora.",
  alternates: { canonical: "/acceso-centro" },
  robots: { index: false, follow: false }
};

type PublicSchoolAccessPageProps = {
  searchParams?: { error?: string };
};

export default function PublicSchoolAccessPage({
  searchParams
}: PublicSchoolAccessPageProps) {
  return (
    <main className="min-h-screen bg-[#F6F3EC] px-5 py-8 text-[#0F172A] sm:py-12">
      <section className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#4E5B61] transition hover:text-[#0F172A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2E7D5A]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a EducaCora
        </Link>

        <div className="mt-8 text-center sm:mt-12">
          <Image
            src="/brand/educore/logo.svg"
            alt="EducaCora"
            width={512}
            height={150}
            priority
            className="mx-auto h-auto w-52 sm:w-64"
          />
          <p className="mt-5 text-sm font-semibold text-[#2E7D5A]">
            El corazón de tu centro educativo.
          </p>
          <h1 className="mt-7 text-3xl font-semibold tracking-normal sm:text-4xl">
            Selecciona tu centro
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[#4E5B61]">
            Elige el centro al que perteneces para acceder con tus credenciales.
          </p>
        </div>

        {searchParams?.error ? (
          <p className="mx-auto mt-6 max-w-xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            El centro solicitado no está disponible. Selecciona uno de los centros autorizados.
          </p>
        ) : null}

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {PUBLIC_SCHOOLS.map((school) => (
            <article
              key={school.slug}
              className="flex min-h-52 flex-col justify-between rounded-lg border border-[#E7EBEE] bg-white p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start gap-4">
                <SchoolLogo
                  size="lg"
                  src={school.brand.assets.icon}
                  name={school.name}
                  initials={school.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-normal text-[#0F172A]">
                      {school.name}
                    </h2>
                    {school.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2E7D5A]/10 px-2.5 py-1 text-xs font-semibold text-[#2E7D5A]">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Centro verificado
                      </span>
                    ) : null}
                  </div>
                  {school.location ? (
                    <p className="mt-2 text-sm text-[#6B737C]">{school.location}</p>
                  ) : null}
                </div>
              </div>

              <Link
                href={getPublicSchoolLoginPath(school)}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1D3045] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E7D5A]"
              >
                Acceder
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#6B737C]">
          La selección del centro no concede permisos. El acceso se valida de forma segura con tu cuenta.
        </p>
      </section>
    </main>
  );
}
