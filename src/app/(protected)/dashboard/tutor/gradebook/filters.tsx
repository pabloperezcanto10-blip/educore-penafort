"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import type { EvaluationCriterion, GradeTerm, GradebookCourse, Subject } from "@/lib/grades/grades";

type GradebookFiltersProps = {
  courses: GradebookCourse[];
  subjects: Subject[];
  courseId: string;
  subjectId: string;
  term: GradeTerm;
  criteria: EvaluationCriterion[];
  criterionId: string;
  assessmentDate: string;
};

export function GradebookFilters({
  courses,
  subjects,
  courseId,
  subjectId,
  term,
  criteria,
  criterionId,
  assessmentDate
}: GradebookFiltersProps) {
  const router = useRouter();

  function pushFilters({
    nextCourseId = courseId,
    nextSubjectId = subjectId,
    nextTerm = term,
    nextCriterionId = criterionId,
    resetCriterion = false
  }: {
    nextCourseId?: string;
    nextSubjectId?: string;
    nextTerm?: GradeTerm;
    nextCriterionId?: string;
    resetCriterion?: boolean;
  }) {
    const params = new URLSearchParams();

    if (nextCourseId) params.set("course_id", nextCourseId);
    if (nextSubjectId) params.set("subject_id", nextSubjectId);
    params.set("term", nextTerm);
    if (!resetCriterion && nextCriterionId) params.set("criterion_id", nextCriterionId);

    if (assessmentDate) {
      params.set("assessment_date", assessmentDate);
    }

    router.push(`/dashboard/tutor/gradebook?${params.toString()}`);
  }

  return (
    <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <Select
        name="course_id"
        label="Curso"
        value={courseId}
        options={courses.map((course) => ({
          value: course.id,
          label: course.name
        }))}
        onChange={(nextCourseId) => pushFilters({ nextCourseId, nextSubjectId: "", resetCriterion: true })}
      />
      <Select
        name="subject_id"
        label="Materia"
        value={subjectId}
        options={subjects.map((subject) => ({
          value: subject.id,
          label: subject.name
        }))}
        onChange={(nextSubjectId) => pushFilters({ nextSubjectId, resetCriterion: true })}
      />
      <Select
        name="term"
        label="Trimestre"
        value={term}
        options={[
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" }
        ]}
        onChange={(nextTerm) => pushFilters({ nextTerm: normalizeTerm(nextTerm), resetCriterion: true })}
      />
      <Select
        name="criterion_id"
        label="Criterio"
        value={criterionId}
        options={criteria.map((criterion) => ({
          value: criterion.id,
          label: `${criterion.name} · ${criterion.weight}% · ${criterion.criterion_type}`
        }))}
      />
      <Input name="assessment_date" label="Fecha" type="date" defaultValue={assessmentDate} />
      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-blue-800 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-900"
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Cargar cuaderno
        </button>
      </div>
    </form>
  );
}

function normalizeTerm(value: string): GradeTerm {
  return value === "2" || value === "3" ? value : "1";
}

function Select({
  name,
  label,
  value,
  options,
  onChange
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
}) {
  const selectProps = onChange
    ? {
        value,
        onChange: (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)
      }
    : {
        defaultValue: value
      };

  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        name={name}
        {...selectProps}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
      >
        <option value="">Selecciona</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Input({
  name,
  label,
  defaultValue,
  type = "text"
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
      />
    </label>
  );
}

