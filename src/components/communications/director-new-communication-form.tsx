"use client";

import { useMemo, useState } from "react";
import type { AdminProfile } from "@/lib/admin/admin";

type RecipientMode = "student_family" | "teacher" | "course_families" | "course_teachers" | "course_all";

type DirectorNewCommunicationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  teachers: AdminProfile[];
  courses: { id: string; name: string }[];
  students: { id: string; name: string; last_name: string; course_id: string }[];
  categories: { value: string; label: string }[];
};

const recipientModes: { value: RecipientMode; label: string; description: string }[] = [
  {
    value: "student_family",
    label: "Familia de alumno",
    description: "Elige curso y alumno; el sistema enviara a sus familias vinculadas."
  },
  {
    value: "teacher",
    label: "Docente",
    description: "Envia un mensaje directo a un profesor o tutor concreto."
  },
  {
    value: "course_families",
    label: "Familias de curso",
    description: "Envia a todas las familias vinculadas a alumnos activos del curso."
  },
  {
    value: "course_teachers",
    label: "Docentes de curso",
    description: "Envia a los docentes con asignaciones en el curso."
  },
  {
    value: "course_all",
    label: "Familias y docentes de curso",
    description: "Envia a familias del curso y docentes asignados."
  }
];

export function DirectorNewCommunicationForm({
  action,
  teachers,
  courses,
  students,
  categories
}: DirectorNewCommunicationFormProps) {
  const [mode, setMode] = useState<RecipientMode>("student_family");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const visibleStudents = useMemo(
    () => students.filter((student) => !courseId || student.course_id === courseId),
    [courseId, students]
  );
  const selectedMode = recipientModes.find((item) => item.value === mode) ?? recipientModes[0];
  const needsCourse = mode !== "teacher";
  const needsStudent = mode === "student_family";
  const needsTeacher = mode === "teacher";
  const allowsRelatedStudent = mode === "teacher";

  return (
    <form action={action} className="mt-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Tipo de destinatario</p>
        <div className="mt-2 grid gap-2">
          {recipientModes.map((item) => (
            <label
              key={item.value}
              className={`cursor-pointer rounded-md border p-3 transition ${
                mode === item.value ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name="recipient_mode"
                value={item.value}
                checked={mode === item.value}
                onChange={() => setMode(item.value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-foreground">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
          Seleccionado: <span className="font-semibold text-foreground">{selectedMode.label}</span>
        </p>
      </div>

      {needsCourse ? (
        <Select
          label="Curso"
          name="course_id"
          value={courseId}
          onChange={(value) => setCourseId(value)}
          options={courses.map((course) => ({ value: course.id, label: course.name }))}
          emptyLabel="Seleccionar curso"
          required
        />
      ) : null}

      {needsStudent ? (
        <Select
          key={courseId}
          label="Alumno"
          name="student_id"
          value={visibleStudents[0]?.id ?? ""}
          options={visibleStudents.map((student) => ({ value: student.id, label: `${student.name} ${student.last_name}` }))}
          emptyLabel="Seleccionar alumno"
          required
        />
      ) : null}

      {needsTeacher ? (
        <Select
          label="Docente"
          name="receiver_id"
          value=""
          options={teachers.map((teacher) => ({ value: teacher.id, label: teacher.full_name || teacher.email || teacher.id }))}
          emptyLabel="Seleccionar docente"
          required
        />
      ) : null}

      {allowsRelatedStudent ? (
        <Select
          label="Alumno relacionado opcional"
          name="student_id"
          value=""
          options={students.map((student) => ({ value: student.id, label: `${student.name} ${student.last_name}` }))}
          emptyLabel="Sin alumno relacionado"
        />
      ) : null}

      <Select label="Categoria" name="category" value="general" options={categories} emptyLabel={null} required />

      <FieldInput name="title" label="Titulo" placeholder="Asunto de la comunicacion" />
      <label className="block text-sm font-medium text-foreground">
        Mensaje
        <textarea
          name="message"
          rows={5}
          required
          placeholder="Escribe el mensaje."
          className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <button className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
        Enviar comunicacion
      </button>
    </form>
  );
}

function Select({
  label,
  name,
  value,
  options,
  emptyLabel,
  required = false,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  emptyLabel: string | null;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <select
        name={name}
        {...(onChange
          ? {
              value,
              onChange: (event) => onChange(event.target.value)
            }
          : {
              defaultValue: value
            })}
        required={required}
        className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {emptyLabel !== null ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldInput({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <input
        name={name}
        required
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
