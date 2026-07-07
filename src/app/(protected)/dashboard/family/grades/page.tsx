import Link from "next/link";
import { BookOpenCheck, Download, FileText, LockKeyhole, Search } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { getFamilyStudentContacts } from "@/lib/communications/notifications";
import {
  getEvaluationPublication,
  getFamilyGrades,
  getFamilyTermSubjectGrades,
  type GradeTerm,
  type GradeWithLabels,
  type TermSubjectGradeWithLabels
} from "@/lib/grades/grades";
import { getFamilyFinalRows, getFinalPublication, type FinalCourseRow } from "@/lib/grades/annual";
import { GradebookBadge, GradebookCard, GradebookCardHeader, ProgressBar, StudentAvatar } from "@/components/grades/gradebook-design";

type PageProps = {
  searchParams?: {
    student_id?: string;
    subject_id?: string;
    term?: string;
    tab?: string;
  };
};

type FamilyGradesTab = "notas" | "boletines" | "final";

type FamilyStudentOption = {
  id: string;
  name: string;
  last_name: string;
  course_id: string;
  courseName: string;
};

type GradeGroup = {
  studentId: string;
  studentName: string;
  courseId: string | null;
  courseName: string;
  subjects: Map<string, SubjectGroup>;
};

type SubjectGroup = {
  subjectId: string;
  subjectName: string;
  terms: Map<GradeTerm, TermGroup>;
};

type TermGroup = {
  term: GradeTerm;
  grades: GradeWithLabels[];
  finalGrade: TermSubjectGradeWithLabels | null;
};

const terms: GradeTerm[] = ["1", "2", "3"];
const tabs: Array<{ id: FamilyGradesTab; label: string }> = [
  { id: "notas", label: "Notas visibles" },
  { id: "boletines", label: "Boletines trimestrales" },
  { id: "final", label: "Boletín final" }
];

export default async function FamilyGradesPage({ searchParams = {} }: PageProps) {
  const profile = await requireRole("family");
  const selectedStudentId = searchParams.student_id ?? "";
  const selectedSubjectId = searchParams.subject_id ?? "";
  const selectedTerm = normalizeTerm(searchParams.term);
  const activeTab = normalizeTab(searchParams.tab);
  const [
    { grades, errorMessage: gradesError },
    { termGrades, errorMessage: termGradesError },
    { rows: finalRows, errorMessage: finalRowsError },
    { students, errorMessage: contactsError }
  ] = await Promise.all([
    getFamilyGrades(profile.id),
    getFamilyTermSubjectGrades(profile.id),
    getFamilyFinalRows(profile.id),
    getFamilyStudentContacts(profile.id)
  ]);
  const pageError = gradesError ?? termGradesError ?? finalRowsError ?? contactsError;
  const subjects = buildSubjectOptions(grades, termGrades);
  const filteredGrades = grades.filter((grade) => {
    if (selectedStudentId && grade.student_id !== selectedStudentId) return false;
    if (selectedSubjectId && grade.subject_id !== selectedSubjectId) return false;
    if (selectedTerm && grade.term !== selectedTerm) return false;
    return true;
  });
  const filteredTermGrades = termGrades.filter((grade) => {
    if (selectedStudentId && grade.student_id !== selectedStudentId) return false;
    if (selectedSubjectId && grade.subject_id !== selectedSubjectId) return false;
    if (selectedTerm && grade.term !== selectedTerm) return false;
    return true;
  });
  const groups = buildGradeGroups(filteredGrades, filteredTermGrades, students);
  const publicationStates = await getPublicationStates(students);
  const finalPublicationStates = await getFinalPublicationStates(students);
  const finalRowsByStudent = groupFinalRowsByStudent(finalRows);
  const selectedStudent = selectedStudentId ? students.find((student) => student.id === selectedStudentId) ?? null : students.length === 1 ? students[0] : null;
  const visibleSubjectCount = countVisibleSubjects(groups);
  const latestGrade = getLatestVisibleGrade(filteredGrades);
  const selectedFinalRows = selectedStudent ? finalRowsByStudent.get(selectedStudent.id) ?? [] : finalRows;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Seguimiento académico</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Calificaciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta notas visibles, observaciones, recomendaciones y boletines publicados por el centro.
          </p>
        </div>
        <Link
          href="/dashboard/family"
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Volver al dashboard
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las calificaciones: {pageError}
        </div>
      ) : null}

      <FamilyGradesSummary
        selectedStudent={selectedStudent}
        students={students}
        visibleSubjectCount={visibleSubjectCount}
        latestGrade={latestGrade}
        publicationStates={publicationStates}
        finalPublicationStates={finalPublicationStates}
      />

      <FiltersCard
        students={students}
        subjects={subjects}
        selectedStudentId={selectedStudentId}
        selectedSubjectId={selectedSubjectId}
        selectedTerm={selectedTerm}
        activeTab={activeTab}
      />

      <GradeTabs activeTab={activeTab} searchParams={searchParams} />

      {activeTab === "notas" ? <VisibleGradesTab groups={groups} /> : null}
      {activeTab === "boletines" ? <TermBulletinsTab students={students} publicationStates={publicationStates} /> : null}
      {activeTab === "final" ? (
        <FinalBulletinTab students={students} publicationStates={finalPublicationStates} finalRowsByStudent={finalRowsByStudent} selectedRows={selectedFinalRows} selectedStudentId={selectedStudent?.id ?? ""} />
      ) : null}
    </section>
  );
}

function FamilyGradesSummary({
  selectedStudent,
  students,
  visibleSubjectCount,
  latestGrade,
  publicationStates,
  finalPublicationStates
}: {
  selectedStudent: FamilyStudentOption | null;
  students: FamilyStudentOption[];
  visibleSubjectCount: number;
  latestGrade: GradeWithLabels | null;
  publicationStates: Map<string, { published: boolean } | null>;
  finalPublicationStates: Map<string, { published: boolean } | null>;
}) {
  const publishedTermCount = Array.from(publicationStates.values()).filter((publication) => publication?.published).length;
  const finalPublishedCount = Array.from(finalPublicationStates.values()).filter((publication) => publication?.published).length;
  const displayName = selectedStudent ? `${selectedStudent.name} ${selectedStudent.last_name}` : students.length > 1 ? "Todos los hijos" : students[0] ? `${students[0].name} ${students[0].last_name}` : "Sin alumno vinculado";
  const courseName = selectedStudent?.courseName ?? (students.length === 1 ? students[0]?.courseName : "Vista familiar");

  return (
    <GradebookCard className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <StudentAvatar name={displayName} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">{displayName}</h2>
              <GradebookBadge tone="green">Modo familia</GradebookBadge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{courseName}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[560px] lg:grid-cols-4">
          <SummaryMetric label="Materias visibles" value={visibleSubjectCount} />
          <SummaryMetric label="Última nota" value={latestGrade ? latestGrade.grade : "-"} hint={latestGrade ? latestGrade.subjectName : "Sin registros"} />
          <SummaryMetric label="Boletines" value={publishedTermCount} hint="trimestrales disponibles" />
          <SummaryMetric label="Final" value={finalPublishedCount > 0 ? "Disponible" : "Bloqueado"} />
        </div>
      </div>
    </GradebookCard>
  );
}

function SummaryMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 line-clamp-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function FiltersCard({
  students,
  subjects,
  selectedStudentId,
  selectedSubjectId,
  selectedTerm,
  activeTab
}: {
  students: FamilyStudentOption[];
  subjects: { id: string; name: string }[];
  selectedStudentId: string;
  selectedSubjectId: string;
  selectedTerm: GradeTerm | "";
  activeTab: FamilyGradesTab;
}) {
  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" action="/dashboard/family/grades">
      <input type="hidden" name="tab" value={activeTab} />
      <div className="grid gap-3 md:grid-cols-4">
        <SelectField label="Hijo" name="student_id" value={selectedStudentId} emptyLabel="Todos" options={students.map((student) => ({ value: student.id, label: `${student.name} ${student.last_name}` }))} />
        <SelectField label="Materia" name="subject_id" value={selectedSubjectId} emptyLabel="Todas" options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} />
        <SelectField label="Trimestre" name="term" value={selectedTerm} emptyLabel="Todos" options={terms.map((term) => ({ value: term, label: `${term}.º trimestre` }))} />
        <div className="flex items-end gap-2">
          <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800">
            <Search className="h-4 w-4" aria-hidden="true" />
            Filtrar
          </button>
          <Link href="/dashboard/family/grades" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Limpiar
          </Link>
        </div>
      </div>
    </form>
  );
}

function SelectField({ label, name, value, emptyLabel, options }: { label: string; name: string; value: string; emptyLabel: string; options: { value: string; label: string }[] }) {
  return (
    <label className="space-y-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={value} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function GradeTabs({ activeTab, searchParams }: { activeTab: FamilyGradesTab; searchParams: PageProps["searchParams"] }) {
  return (
    <GradebookCard className="p-2">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones de calificaciones familiares">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id, searchParams)}
            className={`inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition ${
              activeTab === tab.id ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </GradebookCard>
  );
}

function VisibleGradesTab({ groups }: { groups: GradeGroup[] }) {
  if (groups.length === 0) {
    return <EmptyState text="No hay calificaciones visibles con los filtros seleccionados." />;
  }

  return (
    <section className="space-y-4">
      {groups.map((studentGroup) => (
        <GradebookCard key={studentGroup.studentId} className="p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">{studentGroup.studentName}</h2>
              <p className="text-sm text-slate-500">{studentGroup.courseName}</p>
            </div>
            <GradebookBadge tone="blue">{studentGroup.subjects.size} materia{studentGroup.subjects.size === 1 ? "" : "s"}</GradebookBadge>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {Array.from(studentGroup.subjects.values()).map((subjectGroup) => <SubjectGradesCard key={subjectGroup.subjectId} subjectGroup={subjectGroup} />)}
          </div>
        </GradebookCard>
      ))}
    </section>
  );
}

function SubjectGradesCard({ subjectGroup }: { subjectGroup: SubjectGroup }) {
  const visibleCount = Array.from(subjectGroup.terms.values()).reduce((total, term) => total + term.grades.length + (term.finalGrade ? 1 : 0), 0);
  const average = calculateSubjectAverage(subjectGroup);
  const performance = getPerformanceIndicator(average);
  const progressValue = average ? Number(average) * 10 : 0;

  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50/70 transition open:bg-white open:shadow-sm">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-950">{subjectGroup.subjectName}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {visibleCount} calificaci{visibleCount === 1 ? "ón" : "ones"} visible{visibleCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GradebookBadge tone={average ? "green" : "gray"}>{average ? `Media ${average}` : "Sin media"}</GradebookBadge>
            <GradebookBadge tone={performance.tone}>{performance.label}</GradebookBadge>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <ProgressBar value={progressValue} />
          <span className="text-xs font-semibold text-slate-500 group-open:hidden">Abrir materia</span>
          <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">Cerrar materia</span>
        </div>
      </summary>
      <div className="space-y-2 border-t border-slate-200 p-3">
        {Array.from(subjectGroup.terms.values()).map((termGroup) => <TermAccordion key={termGroup.term} termGroup={termGroup} />)}
      </div>
    </details>
  );
}

function TermAccordion({ termGroup }: { termGroup: TermGroup }) {
  const visibleCount = termGroup.grades.length + (termGroup.finalGrade ? 1 : 0);

  return (
    <details className="group rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-950">
        <span>{termGroup.term}.º trimestre</span>
        <div className="flex items-center gap-2">
          <GradebookBadge tone={termGroup.finalGrade?.final_grade !== null && termGroup.finalGrade?.final_grade !== undefined ? "green" : visibleCount > 0 ? "blue" : "gray"}>
            {termGroup.finalGrade?.final_grade !== null && termGroup.finalGrade?.final_grade !== undefined ? `Final ${termGroup.finalGrade.final_grade}` : `${visibleCount} registro${visibleCount === 1 ? "" : "s"}`}
          </GradebookBadge>
          <span className="text-xs text-slate-400 group-open:hidden">Abrir</span>
          <span className="hidden text-xs text-slate-400 group-open:inline">Cerrar</span>
        </div>
      </summary>
      <div className="border-t border-slate-100 px-3 py-3">
        {termGroup.finalGrade ? <FinalTermRow grade={termGroup.finalGrade} /> : null}
        {termGroup.grades.length === 0 ? <p className="text-xs text-slate-500">No hay pruebas visibles para este trimestre.</p> : null}
        <div className="space-y-2">
          {termGroup.grades.map((grade) => <GradeRow key={grade.id} grade={grade} />)}
        </div>
      </div>
    </details>
  );
}
function FinalTermRow({ grade }: { grade: TermSubjectGradeWithLabels }) {
  return (
    <div className="mb-2 rounded-lg border border-sky-100 bg-sky-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Nota final trimestral</p>
          <p className="mt-1 text-xs text-slate-500">Calculada: {grade.calculated_grade ?? "Pendiente"}</p>
        </div>
        <span className="rounded-full bg-sky-700 px-2.5 py-1 text-sm font-semibold text-white">{grade.final_grade ?? "-"}</span>
      </div>
      {grade.final_observation ? <p className="mt-2 text-xs text-slate-500">{grade.final_observation}</p> : null}
    </div>
  );
}

function GradeRow({ grade }: { grade: GradeWithLabels }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{grade.assessment_name}</p>
          <p className="mt-1 text-xs text-slate-500">{grade.assessment_type}{grade.assessment_date ? ` · ${formatDate(grade.assessment_date)}` : ""}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-950">{grade.grade}</span>
      </div>
      {grade.comment ? <p className="mt-2 text-xs text-slate-500"><span className="font-semibold text-slate-700">Observación:</span> {grade.comment}</p> : null}
      {grade.recommendation ? <p className="mt-1 text-xs text-slate-500"><span className="font-semibold text-slate-700">Recomendación:</span> {grade.recommendation}</p> : null}
    </div>
  );
}

function TermBulletinsTab({ students, publicationStates }: { students: FamilyStudentOption[]; publicationStates: Map<string, { published: boolean; published_at?: string | null } | null> }) {
  if (students.length === 0) {
    return <EmptyState text="No hay alumnos vinculados a esta cuenta familiar." />;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {students.map((student) => (
        <GradebookCard key={student.id} className="p-5">
          <StudentBulletinHeader student={student} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {terms.map((term) => {
              const publication = publicationStates.get(`${student.course_id}:${term}`);
              const isPublished = Boolean(publication?.published);
              return <TermBulletinCard key={term} studentId={student.id} term={term} publication={publication} isPublished={isPublished} />;
            })}
          </div>
        </GradebookCard>
      ))}
    </section>
  );
}

function StudentBulletinHeader({ student }: { student: FamilyStudentOption }) {
  return (
    <div className="flex items-start gap-3">
      <StudentAvatar name={`${student.name} ${student.last_name}`} />
      <div>
        <h2 className="text-base font-bold text-slate-950">{student.name} {student.last_name}</h2>
        <p className="text-sm text-slate-500">{student.courseName}</p>
      </div>
    </div>
  );
}

function TermBulletinCard({ studentId, term, publication, isPublished }: { studentId: string; term: GradeTerm; publication: { published_at?: string | null } | null | undefined; isPublished: boolean }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">{term}.º trimestre</p>
          {isPublished ? (
            <p className="mt-1 text-xs text-emerald-700">Disponible{publication?.published_at ? ` desde ${formatDate(publication.published_at)}` : ""}.</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">El boletín aún no está publicado.</p>
          )}
        </div>
        <GradebookBadge tone={isPublished ? "green" : "gray"}>{isPublished ? "Disponible" : "Bloqueado"}</GradebookBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {isPublished ? (
          <>
            <Link href={`/dashboard/family/grades?student_id=${studentId}&term=${term}&tab=notas`} className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-semibold text-white transition hover:bg-sky-800">Ver boletín</Link>
            <Link href={`/dashboard/reports/term-pdf?student_id=${studentId}&term=${term}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Download className="h-3.5 w-3.5" />PDF</Link>
          </>
        ) : (
          <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />Bloqueado</span>
        )}
      </div>
    </article>
  );
}

function FinalBulletinTab({
  students,
  publicationStates,
  finalRowsByStudent,
  selectedRows,
  selectedStudentId
}: {
  students: FamilyStudentOption[];
  publicationStates: Map<string, { published: boolean } | null>;
  finalRowsByStudent: Map<string, FinalCourseRow[]>;
  selectedRows: FinalCourseRow[];
  selectedStudentId: string;
}) {
  if (students.length === 0) {
    return <EmptyState text="No hay alumnos vinculados a esta cuenta familiar." />;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {students.map((student) => {
        const publication = publicationStates.get(student.course_id);
        const isPublished = Boolean(publication?.published);
        const rows = selectedStudentId === student.id ? selectedRows : finalRowsByStudent.get(student.id) ?? [];
        return (
          <GradebookCard key={student.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <StudentBulletinHeader student={student} />
              <GradebookBadge tone={isPublished ? "green" : "gray"}>{isPublished ? "Disponible" : "Bloqueado"}</GradebookBadge>
            </div>
            {isPublished ? <FinalRows rows={rows} studentId={student.id} /> : <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">El boletín final todavía no está disponible.</p>}
          </GradebookCard>
        );
      })}
    </section>
  );
}

function FinalRows({ rows, studentId }: { rows: FinalCourseRow[]; studentId: string }) {
  if (rows.length === 0) {
    return <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">El boletín final está publicado, pero todavía no hay notas finales cerradas para este alumno.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {rows.map((row) => (
        <div key={`${row.student_id}-${row.subject_id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{row.subjectName}</p>
              <p className="text-xs text-slate-500">T1 {row.term1_grade ?? "-"} / T2 {row.term2_grade ?? "-"} / T3 {row.term3_grade ?? "-"}</p>
            </div>
            <span className="rounded-full bg-sky-700 px-2.5 py-1 text-sm font-semibold text-white">Final {row.final_grade ?? "-"}</span>
          </div>
          {row.final_observation ? <p className="mt-2 text-xs text-slate-500">{row.final_observation}</p> : null}
        </div>
      ))}
      <Link href={`/dashboard/reports/final-pdf?student_id=${studentId}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Descargar PDF final</Link>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">{text}</div>;
}

function buildSubjectOptions(grades: GradeWithLabels[], termGrades: TermSubjectGradeWithLabels[]) {
  const entries: [string, string][] = [
    ...grades.map((grade): [string, string] => [grade.subject_id, grade.subjectName]),
    ...termGrades.map((grade): [string, string] => [grade.subject_id, grade.subjectName])
  ];

  return Array.from(new Map(entries).entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function buildGradeGroups(
  grades: GradeWithLabels[],
  termGrades: TermSubjectGradeWithLabels[],
  students: FamilyStudentOption[]
) {
  const studentsById = new Map(
    students.map((student) => [
      student.id,
      {
        studentName: `${student.name} ${student.last_name}`,
        courseId: student.course_id,
        courseName: student.courseName
      }
    ])
  );
  const groupsByStudent = new Map<string, GradeGroup>();

  function ensureTermGroup(params: {
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    courseId: string | null;
    courseName: string;
    term: GradeTerm;
  }) {
    const studentMeta = studentsById.get(params.studentId);
    let studentGroup = groupsByStudent.get(params.studentId);

    if (!studentGroup) {
      studentGroup = {
        studentId: params.studentId,
        studentName: studentMeta?.studentName ?? params.studentName,
        courseId: studentMeta?.courseId ?? params.courseId,
        courseName: studentMeta?.courseName ?? params.courseName,
        subjects: new Map()
      };
      groupsByStudent.set(params.studentId, studentGroup);
    }

    let subjectGroup = studentGroup.subjects.get(params.subjectId);

    if (!subjectGroup) {
      subjectGroup = {
        subjectId: params.subjectId,
        subjectName: params.subjectName,
        terms: new Map()
      };
      studentGroup.subjects.set(params.subjectId, subjectGroup);
    }

    let termGroup = subjectGroup.terms.get(params.term);

    if (!termGroup) {
      termGroup = {
        term: params.term,
        grades: [],
        finalGrade: null
      };
      subjectGroup.terms.set(params.term, termGroup);
    }

    return termGroup;
  }

  grades.forEach((grade) => {
    ensureTermGroup({
      studentId: grade.student_id,
      studentName: grade.studentName,
      subjectId: grade.subject_id,
      subjectName: grade.subjectName,
      courseId: grade.course_id,
      courseName: studentsById.get(grade.student_id)?.courseName ?? "Curso no disponible",
      term: grade.term
    }).grades.push(grade);
  });

  termGrades.forEach((grade) => {
    ensureTermGroup({
      studentId: grade.student_id,
      studentName: grade.studentName,
      subjectId: grade.subject_id,
      subjectName: grade.subjectName,
      courseId: grade.course_id,
      courseName: grade.courseName,
      term: grade.term
    }).finalGrade = grade;
  });

  return Array.from(groupsByStudent.values()).sort((a, b) => a.studentName.localeCompare(b.studentName, "es"));
}

async function getPublicationStates(students: { course_id: string }[]) {
  const keys = Array.from(new Set(students.flatMap((student) => terms.map((term) => `${student.course_id}:${term}`))));
  const results = await Promise.all(
    keys.map(async (key) => {
      const [courseId, term] = key.split(":") as [string, GradeTerm];
      const { publication } = await getEvaluationPublication({ courseId, term });
      return [key, publication] as const;
    })
  );

  return new Map(results);
}

async function getFinalPublicationStates(students: { course_id: string }[]) {
  const courseIds = Array.from(new Set(students.map((student) => student.course_id)));
  const results = await Promise.all(
    courseIds.map(async (courseId) => {
      const { publication } = await getFinalPublication(courseId);
      return [courseId, publication] as const;
    })
  );

  return new Map(results);
}

function groupFinalRowsByStudent(rows: FinalCourseRow[]) {
  const rowsByStudent = new Map<string, FinalCourseRow[]>();

  rows.forEach((row) => {
    const currentRows = rowsByStudent.get(row.student_id) ?? [];
    currentRows.push(row);
    rowsByStudent.set(row.student_id, currentRows);
  });

  rowsByStudent.forEach((studentRows) => {
    studentRows.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"));
  });

  return rowsByStudent;
}

function countVisibleSubjects(groups: GradeGroup[]) {
  return groups.reduce((total, group) => total + group.subjects.size, 0);
}

function getLatestVisibleGrade(grades: GradeWithLabels[]) {
  return [...grades].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
}

function calculateSubjectAverage(subjectGroup: SubjectGroup) {
  const values = Array.from(subjectGroup.terms.values()).flatMap((term) => term.grades.map((grade) => Number(grade.grade)));
  if (values.length === 0) return null;
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return Number.isInteger(average) ? String(average) : average.toFixed(2);
}

function getPerformanceIndicator(average: string | null): { label: string; tone: "green" | "amber" | "red" | "gray" } {
  if (!average) return { label: "Sin datos", tone: "gray" };
  const value = Number(average);
  if (value >= 7) return { label: "Buen rendimiento", tone: "green" };
  if (value >= 5) return { label: "En progreso", tone: "amber" };
  return { label: "Necesita apoyo", tone: "red" };
}

function normalizeTab(tab: string | undefined): FamilyGradesTab {
  return tabs.some((item) => item.id === tab) ? (tab as FamilyGradesTab) : "notas";
}

function tabHref(tab: FamilyGradesTab, searchParams: PageProps["searchParams"]) {
  const params = new URLSearchParams();
  if (searchParams?.student_id) params.set("student_id", searchParams.student_id);
  if (searchParams?.subject_id) params.set("subject_id", searchParams.subject_id);
  if (searchParams?.term) params.set("term", searchParams.term);
  params.set("tab", tab);
  return `/dashboard/family/grades?${params.toString()}`;
}

function normalizeTerm(term: string | undefined): GradeTerm | "" {
  if (term === "1" || term === "2" || term === "3") {
    return term;
  }
  return "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}