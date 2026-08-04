import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getPublicSchoolLoginPath,
  type PublicSchool
} from "@/lib/schools/public-schools";

export function PublicSchoolCard({ school }: { school: PublicSchool }) {
  return (
    <Link
      href={getPublicSchoolLoginPath(school)}
      aria-label={`Acceder a ${school.name}`}
      className="group relative flex min-h-72 flex-col overflow-hidden rounded-lg border border-[#E7EBEE] bg-white p-5 shadow-[0_14px_38px_rgba(15,27,46,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--school-accent)] hover:shadow-[0_20px_48px_rgba(15,27,46,0.11)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#2E7D5A] sm:p-6"
      style={{ "--school-accent": school.brand.colors.primary } as CSSProperties}
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 bg-[var(--school-accent)] opacity-70 transition group-hover:opacity-100"
        aria-hidden="true"
      />

      <span className="flex h-28 w-full items-center justify-center rounded-md border border-[#EEF0F2] bg-[#FAFAF8] px-6 py-4 sm:h-32">
        <Image
          src={school.brand.assets.logo}
          alt={`Logotipo de ${school.name}`}
          width={512}
          height={180}
          className="max-h-20 w-auto max-w-full object-contain sm:max-h-24"
        />
      </span>

      <span className="flex flex-1 flex-col pt-5">
        <strong className="text-xl font-semibold tracking-normal text-[#0F172A]">
          {school.name}
        </strong>
        <span className="mt-auto flex min-h-11 items-center justify-between gap-3 border-t border-[#EEF0F2] pt-5 text-sm font-semibold text-[#0F172A]">
          Acceder al centro
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#F1F5F3] text-[#2E7D5A] transition group-hover:translate-x-0.5 group-hover:bg-[#E4EFE9]">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
      </span>
    </Link>
  );
}
