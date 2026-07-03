import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAdminCourses } from "@/lib/admin/admin";
import { buildImportPreview, type ImportPreviewRow, type ImportPreviewStatus } from "@/lib/admin/import-preview";
import { confirmAdminImport, previewAdminImport } from "./actions";

type AdminImportPageProps = {
  searchParams?: {
    course_id?: string;
    raw_list?: string;
    preview?: string;
  };
};

const statusStyles: Record<ImportPreviewStatus, string> = {
  nuevo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  duplicado: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700"
};

export default async function AdminImportPage({ searchParams }: AdminImportPageProps) {
  await requireRole("superadmin");
  const { courses, errorMessage: coursesError } = await getAdminCourses();
  const selectedCourseId = searchParams?.course_id ?? "";
  const rawList = searchParams?.raw_list ?? "";
  const shouldPreview = searchParams?.preview === "1" && selectedCourseId && rawList.trim().length > 0;
  const preview = shouldPreview
    ? await buildImportPreview({ courseId: selectedCourseId, rawList })
    : {
        rows: [],
        summary: { nuevos: 0, duplicados: 0, errores: 0 },
        errorMessage: null
      };
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const pageError = coursesError ?? preview.errorMessage;
  const hasNewRows = preview.rows.some((row) => row.status === "nuevo");

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Importación masiva</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Importa alumnos y familias por clase de forma automática.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo preparar la importación: {pageError}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Preparar importación</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pega una línea por alumno. La vista previa no guarda datos en Supabase.
            </p>
          </div>
        </div>

        <form id="admin-import-preview-form" action={previewAdminImport}>
          <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">Curso</span>
              <select
                name="course_id"
                required
                defaultValue={selectedCourseId}
                className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="" disabled>
                  Selecciona curso
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">Lista de alumnos</span>
              <textarea
                name="raw_list"
                required
                rows={9}
                defaultValue={rawList}
                placeholder={"Pablo García López\nLucía Martínez Pérez\nMarcos Ruiz Sánchez"}
                className="min-h-56 rounded-md border border-border bg-white px-3 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Vista previa
            </button>
          </div>
        </form>

        <form action={confirmAdminImport} className="mt-3 flex justify-end">
          <input type="hidden" name="course_id" value={selectedCourseId} />
          <input type="hidden" name="raw_list" value={rawList} />
          <button
            type="submit"
            disabled={!hasNewRows}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar importación
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Vista previa de resultados</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.rows.length > 0
                  ? `Curso seleccionado: ${selectedCourse?.name ?? "Curso"}`
                  : "Todavía no hay datos cargados. Genera una vista previa para revisar la importación."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <SummaryBadge label="Nuevos" value={preview.summary.nuevos} className="text-emerald-700" />
            <SummaryBadge label="Duplicados" value={preview.summary.duplicados} className="text-amber-700" />
            <SummaryBadge label="Errores" value={preview.summary.errores} className="text-red-700" />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">Email familiar</th>
                  <th className="px-4 py-3">Contraseña</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Tabla preparada para mostrar la vista previa de importación.
                    </td>
                  </tr>
                ) : (
                  preview.rows.map((row) => (
                    <PreviewTableRow key={row.id} row={row} courseName={selectedCourse?.name ?? ""} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}

function SummaryBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-md border border-border bg-[#f8fafc] px-3 py-2">
      <p className={`text-lg ${className}`}>{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function PreviewTableRow({ row, courseName }: { row: ImportPreviewRow; courseName: string }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{row.studentName}</p>
        {row.reason ? <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p> : null}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{courseName}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.familyEmail || "-"}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.temporaryPassword}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[row.status]}`}>
          {row.status}
        </span>
      </td>
    </tr>
  );
}
