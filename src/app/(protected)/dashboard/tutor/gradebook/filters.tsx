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
    <form className="grid gap-3 rounded-lg border border-border bg-white p-5 lg:grid-cols-5">
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
      <div className="lg:col-span-5">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
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
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select
        name={name}
        {...selectProps}
        className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
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
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
