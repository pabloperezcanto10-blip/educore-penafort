import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Trash2, Upload } from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
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
import { confirmAdminImport, loadAdminImportCleanup, previewAdminImport } from "./actions";
import { ConfirmImportButton, DeleteCourseActionButton, DeleteStudentActionButton, PreviewSubmitButton } from "./import-buttons";

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

const statusTone: Record<ImportPreviewStatus, "green" | "amber" | "red"> = {
  nuevo: "green",
  duplicado: "amber",
  error: "red"
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
  const detectedStudents = rawList.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Importar / limpiar datos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Importa alumnos y familias por clase o elimina importaciones de forma controlada.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Volver al panel
        </Link>
      </div>

      <HeaderSummary
        activeTab={activeTab}
        selectedCourseName={activeTab === "import" ? selectedCourse?.name : cleanupCourse?.name}
        detectedStudents={activeTab === "import" ? detectedStudents : cleanupData.rows.length}
        nuevos={preview.summary.nuevos}
        duplicados={preview.summary.duplicados}
        errores={preview.summary.errores}
      />

      <GradebookCard className="p-2">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Importar o limpiar datos">
          <TabLink href="/dashboard/admin/import" active={activeTab === "import"} label="Importar alumnos y familias" />
          <TabLink href="/dashboard/admin/import?tab=cleanup" active={activeTab === "cleanup"} label="Borrar importación por curso" />
        </nav>
      </GradebookCard>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo preparar la importación: {pageError}
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

function HeaderSummary({
  activeTab,
  selectedCourseName,
  detectedStudents,
  nuevos,
  duplicados,
  errores
}: {
  activeTab: "import" | "cleanup";
  selectedCourseName?: string;
  detectedStudents: number;
  nuevos: number;
  duplicados: number;
  errores: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <CompactMetric label="Modo" value={activeTab === "import" ? "Importación" : "Limpieza"} tone="blue" />
      <CompactMetric label="Curso" value={selectedCourseName || "Sin seleccionar"} tone={selectedCourseName ? "green" : "gray"} />
      <CompactMetric label="Alumnos detectados" value={detectedStudents} tone="blue" />
      <CompactMetric label="Nuevos" value={nuevos} tone="green" />
      <CompactMetric label="Duplicados / errores" value={`${duplicados} / ${errores}`} tone={errores > 0 ? "red" : duplicados > 0 ? "amber" : "gray"} />
    </div>
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
          title="Importación completada correctamente."
          description="Los datos se han guardado en Supabase y el formulario se ha limpiado para evitar duplicados."
          metrics={[
            ["Alumnos creados", importResult.students],
            ["Familias creadas", importResult.families],
            ["Relaciones creadas", importResult.relations],
            ["Errores", importResult.errors]
          ]}
        />
      ) : null}

      <GradebookCard>
        <GradebookCardHeader title="Preparar importación">
          <GradebookBadge tone="blue">Vista previa obligatoria</GradebookBadge>
        </GradebookCardHeader>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Alumnos y familias por clase</h2>
              <p className="mt-1 text-sm text-slate-500">Pega una línea por alumno. La vista previa no guarda datos en Supabase.</p>
            </div>
          </div>

          <form id="admin-import-preview-form" action={previewAdminImport}>
            <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
              <CourseSelect courses={courses} name="course_id" defaultValue={selectedCourseId} />
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-950">Lista de alumnos</span>
                <textarea
                  name="raw_list"
                  required
                  rows={8}
                  defaultValue={rawList}
                  placeholder={"Pablo García López\nLucía Martínez Pérez\nMarcos Ruiz Sánchez"}
                  className="min-h-48 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <span className="text-xs text-slate-500">Una línea por alumno. El sistema generará el email familiar automáticamente.</span>
              </label>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <PreviewSubmitButton />
            </div>
          </form>

          <form action={confirmAdminImport} className="mt-3 flex justify-end">
            <input type="hidden" name="course_id" value={selectedCourseId} />
            <input type="hidden" name="raw_list" value={rawList} />
            <ConfirmImportButton disabled={!hasNewRows} />
          </form>
        </div>
      </GradebookCard>

      <GradebookCard>
        <GradebookCardHeader title="Vista previa de resultados">
          <div className="flex flex-wrap gap-2">
            <GradebookBadge tone="green">{preview.summary.nuevos} nuevos</GradebookBadge>
            <GradebookBadge tone="amber">{preview.summary.duplicados} duplicados</GradebookBadge>
            <GradebookBadge tone="red">{preview.summary.errores} errores</GradebookBadge>
          </div>
        </GradebookCardHeader>
        <div className="p-4">
          <PreviewHeader rows={preview.rows.length} selectedCourseName={selectedCourseName} />
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Email familiar</th>
                    <th className="px-4 py-3">Contraseña</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {preview.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Tabla preparada para mostrar la vista previa de importación.</td>
                    </tr>
                  ) : (
                    preview.rows.map((row) => <PreviewTableRow key={row.id} row={row} courseName={selectedCourseName} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </GradebookCard>
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

      <GradebookCard>
        <GradebookCardHeader title="Borrar importación por curso">
          <GradebookBadge tone="red">Acción irreversible</GradebookBadge>
        </GradebookCardHeader>
        <div className="p-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Limpieza controlada de alumnos y familias</h2>
              <p className="mt-1 text-sm">Carga alumnos de un curso antes de borrar. Las familias con otros hijos vinculados se mantienen.</p>
            </div>
          </div>

          <form action={loadAdminImportCleanup} className="mt-4 grid gap-3 sm:grid-cols-[280px_auto] sm:items-end">
            <CourseSelect courses={courses} name="cleanup_course_id" defaultValue={selectedCourseId} />
            <button type="submit" className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cargar alumnos
            </button>
          </form>
        </div>
      </GradebookCard>

      {errorMessage ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">No se pudieron cargar los alumnos: {errorMessage}</div> : null}

      <GradebookCard>
        <GradebookCardHeader title="Alumnos cargados">
          <div className="flex flex-wrap gap-2">
            <GradebookBadge tone={rows.length > 0 ? "amber" : "gray"}>{rows.length} alumnos</GradebookBadge>
            {selectedCourseName ? <GradebookBadge tone="blue">{selectedCourseName}</GradebookBadge> : null}
          </div>
        </GradebookCardHeader>
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-slate-500">
              {loaded ? `${rows.length} alumno(s) en ${selectedCourseName || "el curso seleccionado"}.` : "Selecciona un curso y pulsa Cargar alumnos."}
            </p>
            {rows.length > 0 ? <DeleteCourseActionButton courseId={selectedCourseId} /> : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Familia asociada</th>
                    <th className="px-4 py-3">Email familiar</th>
                    <th className="px-4 py-3">Fecha creación</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No hay alumnos cargados para borrar.</td>
                    </tr>
                  ) : (
                    rows.map((row) => <CleanupTableRow key={row.student.id} row={row} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </GradebookCard>
    </>
  );
}

function CleanupTableRow({ row }: { row: CleanupRow }) {
  return (
    <tr className="transition hover:bg-slate-50">
      <td className="px-4 py-3 font-semibold text-slate-950">{getStudentDisplayName(row.student)}</td>
      <td className="px-4 py-3 text-slate-500">{row.families.map((family) => family.full_name || family.email || family.id).join(", ") || "Sin familia"}</td>
      <td className="px-4 py-3 text-slate-500">{row.families.map((family) => family.email || "Sin email").join(", ") || "-"}</td>
      <td className="px-4 py-3 text-slate-500">{formatDate(row.student.created_at)}</td>
      <td className="px-4 py-3">
        <DeleteStudentActionButton studentId={row.student.id} />
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
    <Link
      href={href}
      className={`inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition ${
        active ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {label}
    </Link>
  );
}

function CourseSelect({ courses, name, defaultValue }: { courses: { id: string; name: string }[]; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-950">Curso</span>
      <select name={name} required defaultValue={defaultValue} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
        <option value="" disabled>Selecciona curso</option>
        {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
      </select>
    </label>
  );
}

function SuccessSummary({ title, description, metrics }: { title: string; description: string; metrics: Array<[string, number]> }) {
  return (
    <GradebookCard className="border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm">{description}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            {metrics.map(([label, value]) => <ResultMetric key={label} label={label} value={value} />)}
          </div>
        </div>
      </div>
    </GradebookCard>
  );
}

function PreviewHeader({ rows, selectedCourseName }: { rows: number; selectedCourseName: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sky-700"><FileSpreadsheet className="h-5 w-5" aria-hidden="true" /></span>
      <div>
        <h2 className="text-sm font-semibold text-slate-950">Resultados preparados</h2>
        <p className="mt-1 text-sm text-slate-500">{rows > 0 ? `Curso seleccionado: ${selectedCourseName || "Curso"}` : "Todavía no hay datos cargados. Genera una vista previa para revisar la importación."}</p>
      </div>
    </div>
  );
}

function PreviewTableRow({ row, courseName }: { row: ImportPreviewRow; courseName: string }) {
  return (
    <tr className="transition hover:bg-slate-50">
      <td className="px-4 py-3"><p className="font-semibold text-slate-950">{row.studentName}</p>{row.reason ? <p className="mt-1 text-xs text-slate-500">{row.reason}</p> : null}</td>
      <td className="px-4 py-3 text-slate-500">{courseName}</td>
      <td className="px-4 py-3 text-slate-500">{row.familyEmail || "-"}</td>
      <td className="px-4 py-3 text-slate-500">{row.temporaryPassword}</td>
      <td className="px-4 py-3"><GradebookBadge tone={statusTone[row.status]}>{row.status}</GradebookBadge></td>
    </tr>
  );
}

function CompactMetric({ label, value, tone }: { label: string; value: string | number; tone: "blue" | "green" | "amber" | "red" | "gray" }) {
  return (
    <GradebookCard className="p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2"><GradebookBadge tone={tone}>{value}</GradebookBadge></div>
    </GradebookCard>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-emerald-200 bg-white/70 px-3 py-2"><p className="text-lg font-bold">{value}</p><p className="text-xs font-semibold text-emerald-800">{label}</p></div>;
}

function parseSummaryValue(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
