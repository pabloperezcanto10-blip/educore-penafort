import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicSchoolCard } from "@/components/landing/public-school-card";
import { PublicSiteFooter } from "@/components/landing/public-site-footer";
import { PublicSiteHeader } from "@/components/landing/public-site-header";
import { PUBLIC_SCHOOLS } from "@/lib/schools/public-schools";

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
    <div className="flex min-h-screen flex-col bg-[#F6F3EC] text-[#0F172A]">
      <PublicSiteHeader anchorPrefix="/" showCenterAccess={false} />
      <main className="flex-1 px-5 py-10 sm:py-14 lg:py-16">
        <section className="mx-auto w-full max-w-[980px]">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#B4822C]">
              Centros conectados
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal text-[#0F172A] sm:text-5xl">
              Accede a tu centro
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#4E5B61] sm:text-lg">
              Selecciona tu centro para iniciar sesión.
            </p>
          </div>

          {searchParams?.error ? (
            <p className="mx-auto mt-6 max-w-xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              El centro solicitado no está disponible. Selecciona uno de los centros autorizados.
            </p>
          ) : null}

          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:gap-6">
            {PUBLIC_SCHOOLS.map((school) => (
              <PublicSchoolCard key={school.slug} school={school} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#4E5B61] transition hover:text-[#0F172A] focus-visible:rounded-full focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#2E7D5A]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a la página principal
            </Link>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
