import Link from "next/link";
import { BookOpenCheck, Download, LockKeyhole, Search } from "lucide-react";
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

type PageProps = {
  searchParams?: {
    student_id?: string;
    subject_id?: string;
    term?: string;
  };
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

export default async function FamilyGradesPage({ searchParams = {} }: PageProps) {
  const profile = await requireRole("family");
  const selectedStudentId = searchParams.student_id ?? "";
  const selectedSubjectId = searchParams.subject_id ?? "";
  const selectedTerm = normalizeTerm(searchParams.term);
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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Calificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta las notas por alumno, materia y trimestre, con observaciones y recomendaciones.
          </p>
        </div>
        <Link
          href="/dashboard/family"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al dashboard
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las calificaciones: {pageError}
        </div>
      ) : null}

      <form className="rounded-lg border border-border bg-white p-4" action="/dashboard/family/grades">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-foreground">
            Hijo
            <select
              name="student_id"
              defaultValue={selectedStudentId}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="">Todos</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.last_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-foreground">
            Materia
            <select
              name="subject_id"
              defaultValue={selectedSubjectId}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="">Todas</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-foreground">
            Trimestre
            <select
              name="term"
              defaultValue={selectedTerm}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="">Todos</option>
              {terms.map((term) => (
                <option key={term} value={term}>
                  {term}.o trimestre
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Filtrar
            </button>
            <Link
              href="/dashboard/family/grades"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notas por materia</h2>
          <p className="mt-1 text-sm text-muted-foreground">Flujo organizado por alumno, materia y trimestre.</p>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay calificaciones visibles con los filtros seleccionados.
          </div>
        ) : (
          groups.map((studentGroup) => (
            <article key={studentGroup.studentId} className="rounded-lg border border-border bg-white p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{studentGroup.studentName}</h3>
                  <p className="text-sm text-muted-foreground">{studentGroup.courseName}</p>
                </div>
                <span className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {studentGroup.subjects.size} materia{studentGroup.subjects.size === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {Array.from(studentGroup.subjects.values()).map((subjectGroup) => (
                  <div key={subjectGroup.subjectId} className="rounded-lg border border-border bg-background p-4">
                    <h4 className="text-sm font-semibold text-foreground">{subjectGroup.subjectName}</h4>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {Array.from(subjectGroup.terms.values()).map((termGroup) => (
                        <TermCard key={termGroup.term} termGroup={termGroup} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Boletines</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceso preparado para boletines trimestrales y finales cuando la evaluación esté publicada.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay alumnos vinculados a esta cuenta familiar.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {students.map((student) => (
              <article key={student.id} className="rounded-lg border border-border bg-white p-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {student.name} {student.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{student.courseName}</p>
                </div>
                <div className="mt-4 space-y-3">
                  {terms.map((term) => {
                    const publication = publicationStates.get(`${student.course_id}:${term}`);
                    const isPublished = Boolean(publication?.published);

                    return (
                      <div key={term} className="rounded-md border border-border bg-background p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{term}.o trimestre</p>
                            {isPublished ? (
                              <p className="text-xs text-green-700">
                                Evaluación publicada{publication?.published_at ? ` el ${formatDate(publication.published_at)}` : ""}.
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                El boletín de esta evaluación todavía no está disponible.
                              </p>
                            )}
                          </div>
                          {isPublished ? (
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/dashboard/family/grades?student_id=${student.id}&term=${term}`}
                                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                              >
                                Ver boletín
                              </Link>
                              <Link
                                href={`/dashboard/reports/term-pdf?student_id=${student.id}&term=${term}`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
                              >
                                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                Descargar PDF
                              </Link>
                            </div>
                          ) : (
                            <span className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-medium text-muted-foreground">
                              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                              Bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Boletin final</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nota final anual por materia, disponible solo cuando el centro publique el cierre final.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay alumnos vinculados a esta cuenta familiar.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {students.map((student) => {
              const publication = finalPublicationStates.get(student.course_id);
              const isPublished = Boolean(publication?.published);
              const studentFinalRows = finalRowsByStudent.get(student.id) ?? [];

              return (
                <article key={student.id} className="rounded-lg border border-border bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {student.name} {student.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{student.courseName}</p>
                    </div>
                    {isPublished ? (
                      <span className="rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                        Boletin final publicado
                      </span>
                    ) : (
                      <span className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                        Bloqueado
                      </span>
                    )}
                  </div>

                  {isPublished ? (
                    <div className="mt-4 space-y-3">
                      {studentFinalRows.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                          El boletin final esta publicado, pero todavia no hay notas finales cerradas para este alumno.
                        </p>
                      ) : (
                        studentFinalRows.map((row) => (
                          <div key={`${row.student_id}-${row.subject_id}`} className="rounded-md border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{row.subjectName}</p>
                                <p className="text-xs text-muted-foreground">
                                  T1 {row.term1_grade ?? "-"} / T2 {row.term2_grade ?? "-"} / T3 {row.term3_grade ?? "-"}
                                </p>
                              </div>
                              <span className="rounded-md bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">
                                Final {row.final_grade ?? "-"}
                              </span>
                            </div>
                            {row.final_observation ? (
                              <p className="mt-2 text-xs text-muted-foreground">{row.final_observation}</p>
                            ) : null}
                          </div>
                        ))
                      )}
                      <Link
                        href={`/dashboard/reports/final-pdf?student_id=${student.id}`}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Descargar PDF final
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                      El boletin final de curso todavia no esta disponible.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function TermCard({ termGroup }: { termGroup: TermGroup }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{termGroup.term}.o trimestre</p>
        {termGroup.finalGrade?.final_grade !== null && termGroup.finalGrade?.final_grade !== undefined ? (
          <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
            Final {termGroup.finalGrade.final_grade}
          </span>
        ) : (
          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            Sin final
          </span>
        )}
      </div>

      {termGroup.finalGrade ? (
        <div className="mt-3 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
          <p>
            Calculada:{" "}
            <span className="font-semibold text-foreground">
              {termGroup.finalGrade.calculated_grade ?? "Pendiente"}
            </span>
          </p>
          {termGroup.finalGrade.final_observation ? <p className="mt-1">{termGroup.finalGrade.final_observation}</p> : null}
        </div>
      ) : null}

      <div className="mt-3 space-y-3">
        {termGroup.grades.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay pruebas visibles para este trimestre.</p>
        ) : (
          termGroup.grades.map((grade) => (
            <div key={grade.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{grade.assessment_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {grade.assessment_type} {grade.assessment_date ? `- ${formatDate(grade.assessment_date)}` : ""}
                  </p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-foreground">{grade.grade}</span>
              </div>
              {grade.comment ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Observación:</span> {grade.comment}
                </p>
              ) : null}
              {grade.recommendation ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Recomendación:</span> {grade.recommendation}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
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
  students: { id: string; name: string; last_name: string; course_id: string; courseName: string }[]
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
    const termGroup = ensureTermGroup({
      studentId: grade.student_id,
      studentName: grade.studentName,
      subjectId: grade.subject_id,
      subjectName: grade.subjectName,
      courseId: grade.course_id,
      courseName: studentsById.get(grade.student_id)?.courseName ?? "Curso no disponible",
      term: grade.term
    });
    termGroup.grades.push(grade);
  });

  termGrades.forEach((grade) => {
    const termGroup = ensureTermGroup({
      studentId: grade.student_id,
      studentName: grade.studentName,
      subjectId: grade.subject_id,
      subjectName: grade.subjectName,
      courseId: grade.course_id,
      courseName: grade.courseName,
      term: grade.term
    });
    termGroup.finalGrade = grade;
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
