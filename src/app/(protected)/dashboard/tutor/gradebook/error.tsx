"use client";

import { GradebookCard } from "@/components/grades/gradebook-design";

export default function TutorGradebookError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-normal text-slate-900">Cuaderno de calificaciones</h1>
        <p className="mt-1 text-[13px] text-slate-500">No se pudo cargar el cuaderno.</p>
      </div>
      <GradebookCard className="p-6">
        <p className="text-sm font-semibold text-red-700">Error al cargar</p>
        <p className="mt-1 text-sm text-slate-500">Inténtalo de nuevo. Si el problema continúa, revisa la conexión o los permisos.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-800 px-4 text-sm font-semibold text-white transition hover:bg-blue-900"
        >
          Reintentar
        </button>
      </GradebookCard>
    </section>
  );
}
