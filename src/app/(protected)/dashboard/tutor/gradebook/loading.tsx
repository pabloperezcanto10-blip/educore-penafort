import { GradebookCard } from "@/components/grades/gradebook-design";

export default function TutorGradebookLoading() {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-72 animate-pulse rounded-md bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-slate-200" />
      </div>
      <GradebookCard className="p-5">
        <div className="grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      </GradebookCard>
      <section className="grid gap-4 lg:grid-cols-2">
        <GradebookCard className="h-40 animate-pulse bg-slate-100"><span className="sr-only">Cargando</span></GradebookCard>
        <GradebookCard className="h-40 animate-pulse bg-slate-100"><span className="sr-only">Cargando</span></GradebookCard>
      </section>
      <GradebookCard className="p-5">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      </GradebookCard>
    </section>
  );
}

