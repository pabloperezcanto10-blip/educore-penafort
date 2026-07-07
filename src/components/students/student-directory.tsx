import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { GradebookBadge, GradebookCard, StudentAvatar } from "@/components/grades/gradebook-design";

export type StudentDirectoryCourseOption = {
  id: string;
  name: string;
};

export type StudentDirectoryItem = {
  id: string;
  name: string;
  lastName: string;
  courseName: string;
  active: boolean;
  href: string;
  meta?: string;
};

export function StudentDirectoryHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </header>
  );
}

export function StudentDirectoryFilters({
  courses,
  query,
  selectedCourseId,
  cleanHref,
}: {
  courses: StudentDirectoryCourseOption[];
  query?: string;
  selectedCourseId?: string;
  cleanHref: string;
}) {
  return (
    <GradebookCard className="p-4">
      <form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_240px_auto_auto] lg:items-end">
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          <span>Buscar alumno</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={query ?? ""}
              placeholder="Nombre o apellidos"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </label>

        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          <span>Curso</span>
          <select
            name="course_id"
            defaultValue={selectedCourseId ?? ""}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">Todos los cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-11 rounded-xl bg-sky-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-100"
        >
          Filtrar
        </button>
        <Link
          href={cleanHref}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
        >
          Limpiar
        </Link>
      </form>
    </GradebookCard>
  );
}

export function StudentDirectoryList({
  students,
  emptyText = "No hay alumnos para los filtros seleccionados.",
}: {
  students: StudentDirectoryItem[];
  emptyText?: string;
}) {
  if (students.length === 0) {
    return (
      <GradebookCard className="p-8 text-center">
        <p className="text-sm text-slate-500">{emptyText}</p>
      </GradebookCard>
    );
  }

  return (
    <GradebookCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Alumno</th>
              <th className="px-5 py-3">Curso</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.map((student) => {
              const fullName = `${student.name} ${student.lastName}`.trim();

              return (
                <tr key={student.id} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={fullName} />
                      <div>
                        <p className="font-semibold text-slate-950">{fullName}</p>
                        {student.meta ? <p className="text-xs text-slate-500">{student.meta}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{student.courseName}</td>
                  <td className="px-5 py-3">
                    <GradebookBadge tone={student.active ? "green" : "gray"}>{student.active ? "Activo" : "Inactivo"}</GradebookBadge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={student.href}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GradebookCard>
  );
}