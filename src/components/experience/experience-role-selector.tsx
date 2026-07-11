"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CoriumAvatar } from "@/components/ai/corium-avatar";
import { experienceRoles, type ExperienceRole } from "@/components/experience/experience-data";

const transitionCopy: Record<ExperienceRole, string> = {
  director: "Ahora descubrirás EducaCora desde la perspectiva de Dirección.",
  docente: "Ahora verás cómo trabaja un docente en su día a día.",
  familia: "Ahora conocerás la experiencia de las familias."
};

export function ExperienceRoleSelector() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<ExperienceRole | null>(null);

  function selectRole(role: ExperienceRole, href: string) {
    setSelectedRole(role);
    window.setTimeout(() => {
      router.push(`${href}?guide=1`);
    }, 420);
  }

  return (
    <>
      <div id="experience-roles" className="mt-4 grid scroll-mt-6 gap-3">
        {experienceRoles.map((role, index) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          const isDimmed = selectedRole !== null && !isSelected;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => selectRole(role.id, role.href)}
              className={`experience-card-motion experience-fade-up experience-delay-${Math.min(index + 2, 4)} group flex w-full items-center justify-between gap-4 rounded-2xl border bg-white p-4 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isSelected ? "border-emerald-300 bg-emerald-50 shadow-[0_18px_44px_rgba(46,125,90,.14)]" : "border-slate-200 hover:border-emerald-200"
              } ${isDimmed ? "opacity-55" : "opacity-100"}`}
              aria-label={`Explorar perfil ${role.label}`}
            >
              <div className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${isSelected ? "bg-emerald-100 text-emerald-800" : "bg-emerald-50 text-emerald-700"}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-950">{role.label}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{role.description}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {selectedRole ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f6f3ec]/88 px-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="experience-scale-in flex w-full max-w-md items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <CoriumAvatar className="h-16 w-16 rounded-full border border-amber-200 bg-white object-cover" priority />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Preparando recorrido</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{transitionCopy[selectedRole]}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
