"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { GradeTerm, GradebookCourse, Subject } from "@/lib/grades/grades";

type EvaluationSettingsFiltersProps = {
  courses: GradebookCourse[];
  subjects: Subject[];
  courseId: string;
  subjectId: string;
  term: GradeTerm;
};

export function EvaluationSettingsFilters({
  courses,
  subjects,
  courseId,
  subjectId,
  term
}: EvaluationSettingsFiltersProps) {
  const router = useRouter();

  function pushFilters(next: { courseId?: string; subjectId?: string; term?: string }) {
    const params = new URLSearchParams();
    const nextCourseId = next.courseId ?? courseId;
    const nextSubjectId = next.subjectId ?? subjectId;
    const nextTerm = next.term ?? term;

    if (nextCourseId) {
      params.set("course_id", nextCourseId);
    }

    if (nextSubjectId) {
      params.set("subject_id", nextSubjectId);
    }

    params.set("term", nextTerm);
    router.push(`/dashboard/tutor/evaluation-settings?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-white p-5 lg:grid-cols-3">
      <Select
        label="Curso"
        value={courseId}
        options={courses.map((course) => ({ value: course.id, label: course.name }))}
        onChange={(value) => pushFilters({ courseId: value, subjectId: "" })}
      />
      <Select
        label="Materia"
        value={subjectId}
        options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        onChange={(value) => pushFilters({ subjectId: value })}
      />
      <Select
        label="Trimestre"
        value={term}
        options={[
          { value: "1", label: "Trimestre 1" },
          { value: "2", label: "Trimestre 2" },
          { value: "3", label: "Trimestre 3" }
        ]}
        onChange={(value) => pushFilters({ term: value })}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
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
