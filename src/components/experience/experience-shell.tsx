"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { experienceNavigation, experienceRoles, type ExperienceRole } from "@/components/experience/experience-data";
import type { BrandConfig } from "@/lib/branding/brand-config";

type ExperienceShellProps = {
  brand: BrandConfig;
  role: ExperienceRole;
  onReset: () => void;
  children: ReactNode;
};

export function ExperienceShell({ brand, role, onReset, children }: ExperienceShellProps) {
  return (
    <div className="min-h-screen bg-[#f6f3ec] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white/92 px-4 py-5 shadow-sm lg:sticky lg:top-0 lg:h-screen">
          <Link href="/" className="inline-flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50">
            <Image src={brand.assets.logo} alt={brand.productName} width={512} height={150} className="h-auto w-44" priority />
          </Link>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-3">
              <CoriumAvatar className="h-12 w-12 rounded-full object-cover" priority />
              <div>
                <p className="text-sm font-bold text-slate-950">Experience activa</p>
                <p className="text-xs font-medium text-emerald-700">{brand.name} · datos ficticios</p>
              </div>
            </div>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Navegación Experience">
            {experienceNavigation.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    index === 0 ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Explorar otro perfil</p>
            <div className="mt-2 space-y-1">
              {experienceRoles.map((profile) => (
                <Link
                  key={profile.id}
                  href={profile.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    profile.id === role ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {profile.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restablecer Experience
          </button>
        </aside>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
