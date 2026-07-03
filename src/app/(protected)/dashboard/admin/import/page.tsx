import Link from "next/link";
import { CheckCircle2, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminCourses,
  getAdminFamilyRelations,
  getAdminProfiles,
  getAdminStudents,
  getStudentDisplayName,
  type AdminProfile,
  type AdminStudent
} from "@/lib/admin/admin";
import { buildImportPreview, type ImportPreviewRow, type ImportPreviewStatus } from "@/lib/admin/import-preview";
import {
  confirmAdminImport,
  deleteImportedCourse,
  deleteImportedStudent,
  loadAdminImportCleanup,
  previewAdminImport
} from "./actions";
import { ConfirmImportButton, DeleteImportButton, PreviewSubmitButton } from "./import-buttons";

type AdminImportPageProps = {
  searchParams?: {
    tab?: string;
    course_id?: string;
    raw_list?: string;
    preview?: string;
    imported?: string;
    cleanup?: string;
    cleanup_course_id?: string;
    deleted?: string;
    students?: string;
    families?: string;
    relations?: string;
    errors?: string;
    preserved?: string;
  };
};

type CleanupRow = {
  student: AdminStudent;
  families: AdminProfile[];
};

const statusStyles: Record<ImportPreviewStatus, string> = {
  nuevo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  duplicado: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700"
};

export default async function AdminImportPage({ searchParams }: AdminImportPageProps) {
  await requireRole("superadmin");
  const activeTab = searchParams?.tab === "cleanup" ? "cleanup" : "import";
  const { courses, errorMessage: coursesError } = await getAdminCourses();
  const selectedCourseId = searchParams?.course_id ?? "";
  const rawList = searchParams?.raw_list ?? "";
  const cleanupCourseId = searchParams?.cleanup_course_id ?? "";
  const shouldPreview = activeTab === "import" && searchParams?.preview === "1" && selectedCourseId && rawList.trim().length > 0;
  const preview = shouldPreview
    ? await buildImportPreview({ courseId: selectedCourseId, rawList })
    : {
        rows: [],
        summary: { nuevos: 0, duplicados: 0, errores: 0 },
        errorMessage: null
      };
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const cleanupCourse = courses.find((course) => course.id === cleanupCourseId);
  const pageError = coursesError ?? preview.errorMessage;
  const hasNewRows = preview.rows.some((row) => row.status === "nuevo");
  const importResult = searchParams?.imported === "1"
    ? {
        students: parseSummaryValue(searchParams.students),
        families: parseSummaryValue(searchParams.families),
        relations: parseSummaryValue(searchParams.relations),
        errors: parseSummaryValue(searchParams.errors)
      }
    : null;
  const deleteResult = searchParams?.deleted === "1"
    ? {
        students: parseSummaryValue(searchParams.students),
        families: parseSummaryValue(searchParams.families),
        relations: parseSummaryValue(searchParams.relations),
        preserved: parseSummaryValue(searchParams.preserved)
      }
    : null;
  const cleanupData = activeTab === "cleanup" && searchParams?.cleanup === "1" && cleanupCourseId
    ? await loadCleanupRows(cleanupCourseId)
    : { rows: [], errorMessage: null };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Importar / limpiar datos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Importa alumnos y familias por clase o elimina importaciones de forma controlada.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-white p-2 shadow-sm">
        <TabLink href="/dashboard/admin/import" active={activeTab === "import"} label="Importar alumnos y familias" />
        <TabLink href="/dashboard/admin/import?tab=cleanup" active={activeTab === "cleanup"} label="Borrar importacion por curso" />
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo preparar la importacion: {pageError}
        </div>
      ) : null}

      {activeTab === "import" ? (
        <ImportTab
          courses={courses}
          selectedCourseId={selectedCourseId}
          rawList={rawList}
          preview={preview}
          selectedCourseName={selectedCourse?.name ?? ""}
          hasNewRows={hasNewRows}
          importResult={importResult}
        />
      ) : (
        <CleanupTab
          courses={courses}
          selectedCourseId={cleanupCourseId}
          selectedCourseName={cleanupCourse?.name ?? ""}
          rows={cleanupData.rows}
          errorMessage={cleanupData.errorMessage}
          deleteResult={deleteResult}
          loaded={searchParams?.cleanup === "1"}
        />
      )}
    </section>
  );
}

function ImportTab({
  courses,
  selectedCourseId,
  rawList,
  preview,
  selectedCourseName,
  hasNewRows,
  importResult
}: {
  courses: { id: string; name: string }[];
  selectedCourseId: string;
  rawList: string;
  preview: { rows: ImportPreviewRow[]; summary: { nuevos: number; duplicados: number; errores: number } };
  selectedCourseName: string;
  hasNewRows: boolean;
  importResult: { students: number; families: number; relations: number; errors: number } | null;
}) {
  return (
    <>
      {importResult ? (
        <SuccessSummary
          title="Importacion completada correctamente."
          description="Los datos se han guardado en Supabase y el formulario se ha limpiado para evitar duplicados."
          metrics={[
            ["Alumnos creados", importResult.students],
            ["Familias creadas", importResult.families],
            ["Relaciones creadas", importResult.relations],
            ["Errores", importResult.errors]
          ]}
        />
      ) : null}

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Preparar importacion</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pega una linea por alumno. La vista previa no guarda datos en Supabase.</p>
          </div>
        </div>

        <form id="admin-import-preview-form" action={previewAdminImport}>
          <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
            <CourseSelect courses={courses} name="course_id" defaultValue={selectedCourseId} />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">Lista de alumnos</span>
              <textarea
                name="raw_list"
                required
                rows={9}
                defaultValue={rawList}
                placeholder={"Pablo Garcia Lopez\nLucia Martinez Perez\nMarcos Ruiz Sanchez"}
                className="min-h-56 rounded-md border border-border bg-white px-3 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <PreviewSubmitButton />
          </div>
        </form>

        <form action={confirmAdminImport} className="mt-3 flex justify-end">
          <input type="hidden" name="course_id" value={selectedCourseId} />
          <input type="hidden" name="raw_list" value={rawList} />
          <ConfirmImportButton disabled={!hasNewRows} />
        </form>
      </section>

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <PreviewHeader rows={preview.rows.length} selectedCourseName={selectedCourseName} />
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">Email familiar</th>
                  <th className="px-4 py-3">Contrasena</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tabla preparada para mostrar la vista previa de importacion.</td>
                  </tr>
                ) : (
                  preview.rows.map((row) => <PreviewTableRow key={row.id} row={row} courseName={selectedCourseName} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold sm:max-w-sm">
          <SummaryBadge label="Nuevos" value={preview.summary.nuevos} className="text-emerald-700" />
          <SummaryBadge label="Duplicados" value={preview.summary.duplicados} className="text-amber-700" />
          <SummaryBadge label="Errores" value={preview.summary.errores} className="text-red-700" />
        </div>
      </section>
    </>
  );
}

function CleanupTab({
  courses,
  selectedCourseId,
  selectedCourseName,
  rows,
  errorMessage,
  deleteResult,
  loaded
}: {
  courses: { id: string; name: string }[];
  selectedCourseId: string;
  selectedCourseName: string;
  rows: CleanupRow[];
  errorMessage: string | null;
  deleteResult: { students: number; families: number; relations: number; preserved: number } | null;
  loaded: boolean;
}) {
  return (
    <>
      {deleteResult ? (
        <SuccessSummary
          title="Datos eliminados correctamente."
          description={deleteResult.preserved > 0 ? "Se mantuvieron familias con otros hijos vinculados." : "La limpieza del curso seleccionado ha finalizado."}
          metrics={[
            ["Alumnos borrados", deleteResult.students],
            ["Familias borradas", deleteResult.families],
            ["Relaciones borradas", deleteResult.relations],
            ["Familias mantenidas", deleteResult.preserved]
          ]}
        />
      ) : null}

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Borrar datos por curso</h2>
            <p className="mt-1 text-sm text-muted-foreground">Carga alumnos de un curso y elimina alumnos/familias asociadas de forma controlada.</p>
          </div>
        </div>

        <form action={loadAdminImportCleanup} className="mt-5 grid gap-3 sm:grid-cols-[280px_auto] sm:items-end">
          <CourseSelect courses={courses} name="cleanup_course_id" defaultValue={selectedCourseId} />
          <button type="submit" className="inline-flex h-11 w-fit items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted">
            Cargar alumnos
          </button>
        </form>
      </section>

      {errorMessage ? <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">No se pudieron cargar los alumnos: {errorMessage}</div> : null}

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Alumnos cargados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loaded ? `${rows.length} alumno(s) en ${selectedCourseName || "el curso seleccionado"}.` : "Selecciona un curso y pulsa Cargar alumnos."}
            </p>
          </div>
          {rows.length > 0 ? (
            <form action={deleteImportedCourse}>
              <input type="hidden" name="cleanup_course_id" value={selectedCourseId} />
              <DeleteImportButton label="Borrar curso completo" confirmTitle="Borrar curso completo" confirmMessage="Esta accion eliminara todos los alumnos del curso y posibles familias asociadas. No se puede deshacer." />
            </form>
          ) : null}
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Familia asociada</th>
                  <th className="px-4 py-3">Email familiar</th>
                  <th className="px-4 py-3">Fecha creacion</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay alumnos cargados para borrar.</td>
                  </tr>
                ) : (
                  rows.map((row) => <CleanupTableRow key={row.student.id} row={row} courseId={selectedCourseId} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function CleanupTableRow({ row, courseId }: { row: CleanupRow; courseId: string }) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-foreground">{getStudentDisplayName(row.student)}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.families.map((family) => family.full_name || family.email || family.id).join(", ") || "Sin familia"}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.families.map((family) => family.email || "Sin email").join(", ") || "-"}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(row.student.created_at)}</td>
      <td className="px-4 py-3">
        <form action={deleteImportedStudent}>
          <input type="hidden" name="cleanup_course_id" value={courseId} />
          <input type="hidden" name="student_id" value={row.student.id} />
          <DeleteImportButton label="Borrar alumno" variant="outline" />
        </form>
      </td>
    </tr>
  );
}

async function loadCleanupRows(courseId: string): Promise<{ rows: CleanupRow[]; errorMessage: string | null }> {
  const [studentsResult, relationsResult, profilesResult] = await Promise.all([getAdminStudents(), getAdminFamilyRelations(), getAdminProfiles()]);
  const errorMessage = studentsResult.errorMessage ?? relationsResult.errorMessage ?? profilesResult.errorMessage;

  if (errorMessage) {
    return { rows: [], errorMessage };
  }

  const profileById = new Map(profilesResult.profiles.map((profile) => [profile.id, profile]));
  const relationsByStudent = new Map<string, string[]>();

  for (const relation of relationsResult.relations) {
    const current = relationsByStudent.get(relation.student_id) ?? [];
    current.push(relation.parent_id);
    relationsByStudent.set(relation.student_id, current);
  }

  return {
    rows: studentsResult.students
      .filter((student) => student.course_id === courseId)
      .map((student) => ({
        student,
        families: (relationsByStudent.get(student.id) ?? [])
          .map((parentId) => profileById.get(parentId))
          .filter((profile): profile is AdminProfile => Boolean(profile))
      })),
    errorMessage: null
  };
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {label}
    </Link>
  );
}

function CourseSelect({ courses, name, defaultValue }: { courses: { id: string; name: string }[]; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-foreground">Curso</span>
      <select name={name} required defaultValue={defaultValue} className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
        <option value="" disabled>Selecciona curso</option>
        {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
      </select>
    </label>
  );
}

function SuccessSummary({ title, description, metrics }: { title: string; description: string; metrics: Array<[string, number]> }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm">{description}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            {metrics.map(([label, value]) => <ResultMetric key={label} label={label} value={value} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewHeader({ rows, selectedCourseName }: { rows: number; selectedCourseName: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary"><FileSpreadsheet className="h-5 w-5" aria-hidden="true" /></span>
      <div>
        <h2 className="text-sm font-semibold text-foreground">Vista previa de resultados</h2>
        <p className="mt-1 text-sm text-muted-foreground">{rows > 0 ? `Curso seleccionado: ${selectedCourseName || "Curso"}` : "Todavia no hay datos cargados. Genera una vista previa para revisar la importacion."}</p>
      </div>
    </div>
  );
}

function SummaryBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className="rounded-md border border-border bg-[#f8fafc] px-3 py-2"><p className={`text-lg ${className}`}>{value}</p><p className="text-muted-foreground">{label}</p></div>;
}

function PreviewTableRow({ row, courseName }: { row: ImportPreviewRow; courseName: string }) {
  return (
    <tr>
      <td className="px-4 py-3"><p className="font-medium text-foreground">{row.studentName}</p>{row.reason ? <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p> : null}</td>
      <td className="px-4 py-3 text-muted-foreground">{courseName}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.familyEmail || "-"}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.temporaryPassword}</td>
      <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[row.status]}`}>{row.status}</span></td>
    </tr>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-emerald-200 bg-white/70 px-3 py-2"><p className="text-lg font-semibold">{value}</p><p className="text-xs font-medium text-emerald-800">{label}</p></div>;
}

function parseSummaryValue(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}