import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getObservationsForStudent, getStudentById } from "@/lib/tutors/students";
import { ReadonlyStudentObservations } from "@/components/students/readonly-student-observations";

type AdminStudentDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AdminStudentDetailPage({ params }: AdminStudentDetailPageProps) {
  await requireRole("superadmin");
  const { student, errorMessage } = await getStudentById(params.id);

  if (errorMessage) {
    return (
      <section className="space-y-6">
        <BackLink />
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la ficha del alumno: {errorMessage}
        </div>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="space-y-6">
        <BackLink />
        <div className="rounded-lg border border-border bg-white p-6">
          <h1 className="text-xl font-semibold text-foreground">Alumno no encontrado</h1>
        </div>
      </section>
    );
  }

  const { observations, errorMessage: observationsErrorMessage } = await getObservationsForStudent(student.id);

  return (
    <section className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            {student.name} {student.last_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Ficha del alumno para superadmin</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          {student.active ? "Activo" : "Inactivo"}
        </span>
      </div>

      <article className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Datos básicos</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" value={student.name} />
          <Field label="Apellidos" value={student.last_name} />
          <Field label="Fecha de nacimiento" value={student.birth_date ?? "Sin fecha registrada"} />
          <Field label="Curso" value={student.courses?.name ?? student.course_id} />
          <Field label="ID de curso" value={student.course_id} />
          <Field label="Estado" value={student.active ? "Activo" : "Inactivo"} />
        </dl>
      </article>

      <ReadonlyStudentObservations observations={observations} errorMessage={observationsErrorMessage} />
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/admin/students"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a alumnos
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
