import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/session";
import { calculateAnnualGrade, roundAnnualGrade } from "@/lib/grades/annual";

type ReportClient = Awaited<ReturnType<typeof createClient>>;

type StudentRow = {
  id: string;
  name: string;
  last_name: string;
  course_id: string;
  academic_year_id: string;
};

type CourseRow = {
  id: string;
  name: string;
};

type AcademicYearRow = {
  id: string;
  name: string;
};

type PublicationRow = {
  published: boolean;
  published_at: string | null;
};

type AssignmentRow = {
  teacher_id: string;
  subject_id: string | null;
};

type TermSubjectGradeRow = {
  subject_id: string;
  teacher_id: string;
  term: "1" | "2" | "3";
  final_grade: number | null;
};

type AnnualWeightRow = {
  teacher_id: string;
  subject_id: string;
  term1_weight: number;
  term2_weight: number;
  term3_weight: number;
};

type FinalCourseGradeRow = {
  subject_id: string;
  teacher_id: string;
  term1_grade: number | null;
  term2_grade: number | null;
  term3_grade: number | null;
  term1_weight: number;
  term2_weight: number;
  term3_weight: number;
  calculated_grade: number | null;
  final_grade: number | null;
  final_observation: string | null;
  status: "pending" | "draft" | "closed";
};

type SubjectRow = {
  id: string;
  name: string;
};

export type FinalReportData = {
  academicYearName: string;
  studentName: string;
  courseName: string;
  publishedAt: string | null;
  rows: {
    subjectName: string;
    term1Grade: number | null;
    term2Grade: number | null;
    term3Grade: number | null;
    weight1: number;
    weight2: number;
    weight3: number;
    finalGrade: number | null;
    finalObservation: string | null;
  }[];
};

const defaultWeight = { term1_weight: 33, term2_weight: 33, term3_weight: 34 };

export async function getFinalReportForProfile({
  profile,
  studentId
}: {
  profile: Profile;
  studentId: string;
}): Promise<{ report: FinalReportData | null; errorMessage: string | null; status: number }> {
  const supabase = (hasSupabaseAdminClient() ? createAdminClient() : await createClient()) as unknown as ReportClient;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,name,last_name,course_id,academic_year_id")
    .eq("id", studentId)
    .maybeSingle<StudentRow>();

  if (studentError) return { report: null, errorMessage: studentError.message, status: 500 };
  if (!student) return { report: null, errorMessage: "Alumno no encontrado.", status: 404 };

  if (profile.role === "family") {
    const client = await createClient();
    const { data: relation, error: relationError } = await client
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", profile.id)
      .eq("student_id", studentId)
      .maybeSingle<{ student_id: string }>();

    if (relationError) return { report: null, errorMessage: relationError.message, status: 500 };
    if (!relation) return { report: null, errorMessage: "No tienes acceso a este alumno.", status: 403 };
  }

  if (profile.role !== "family" && profile.role !== "director" && profile.role !== "superadmin") {
    return { report: null, errorMessage: "No tienes permisos para descargar este boletín.", status: 403 };
  }

  const [
    { data: course, error: courseError },
    { data: academicYear, error: academicYearError },
    { data: publication, error: publicationError },
    { data: assignments, error: assignmentsError },
    { data: termGrades, error: termGradesError },
    { data: finalRows, error: finalRowsError }
  ] = await Promise.all([
    supabase.from("courses").select("id,name").eq("id", student.course_id).maybeSingle<CourseRow>(),
    supabase.from("academic_years").select("id,name").eq("id", student.academic_year_id).maybeSingle<AcademicYearRow>(),
    supabase
      .from("final_evaluation_publications")
      .select("published,published_at")
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .maybeSingle<PublicationRow>(),
    supabase
      .from("teacher_assignments")
      .select("teacher_id,subject_id")
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .returns<AssignmentRow[]>(),
    supabase
      .from("term_subject_grades")
      .select("subject_id,teacher_id,term,final_grade")
      .eq("student_id", studentId)
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .eq("status", "closed")
      .returns<TermSubjectGradeRow[]>(),
    supabase
      .from("final_course_grades")
      .select("subject_id,teacher_id,term1_grade,term2_grade,term3_grade,term1_weight,term2_weight,term3_weight,calculated_grade,final_grade,final_observation,status")
      .eq("student_id", studentId)
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .returns<FinalCourseGradeRow[]>()
  ]);

  const queryError =
    courseError?.message ??
    academicYearError?.message ??
    publicationError?.message ??
    assignmentsError?.message ??
    termGradesError?.message ??
    finalRowsError?.message ??
    null;
  if (queryError) return { report: null, errorMessage: queryError, status: 500 };

  if (profile.role === "family" && !publication?.published) {
    return { report: null, errorMessage: "El boletín final todavía no está disponible.", status: 403 };
  }

  const validAssignments = (assignments ?? []).filter(
    (assignment): assignment is { teacher_id: string; subject_id: string } => Boolean(assignment.subject_id)
  );
  const subjectIds = Array.from(new Set(validAssignments.map((assignment) => assignment.subject_id)));
  const teacherIds = Array.from(new Set(validAssignments.map((assignment) => assignment.teacher_id)));

  const [{ data: subjects, error: subjectsError }, { data: weights, error: weightsError }] = await Promise.all([
    subjectIds.length
      ? supabase.from("subjects").select("id,name").in("id", subjectIds).returns<SubjectRow[]>()
      : Promise.resolve({ data: [], error: null }),
    subjectIds.length
      ? supabase
          .from("annual_evaluation_weights")
          .select("teacher_id,subject_id,term1_weight,term2_weight,term3_weight")
          .eq("course_id", student.course_id)
          .eq("academic_year_id", student.academic_year_id)
          .in("subject_id", subjectIds)
          .in("teacher_id", teacherIds)
          .eq("active", true)
          .returns<AnnualWeightRow[]>()
      : Promise.resolve({ data: [], error: null })
  ]);

  const labelError = subjectsError?.message ?? weightsError?.message ?? null;
  if (labelError) return { report: null, errorMessage: labelError, status: 500 };

  const subjectsById = new Map((subjects ?? []).map((subject: SubjectRow) => [subject.id, subject.name]));
  const weightsByKey = new Map((weights ?? []).map((weight: AnnualWeightRow) => [`${weight.teacher_id}:${weight.subject_id}`, weight]));
  const termByKey = new Map((termGrades ?? []).map((grade: TermSubjectGradeRow) => [`${grade.teacher_id}:${grade.subject_id}:${grade.term}`, grade.final_grade]));
  const finalByKey = new Map((finalRows ?? []).map((row: FinalCourseGradeRow) => [`${row.teacher_id}:${row.subject_id}`, row]));

  const rows = validAssignments
    .map((assignment) => {
      const final = finalByKey.get(`${assignment.teacher_id}:${assignment.subject_id}`);
      const weight = weightsByKey.get(`${assignment.teacher_id}:${assignment.subject_id}`) ?? defaultWeight;
      const term1 = final?.term1_grade ?? termByKey.get(`${assignment.teacher_id}:${assignment.subject_id}:1`) ?? null;
      const term2 = final?.term2_grade ?? termByKey.get(`${assignment.teacher_id}:${assignment.subject_id}:2`) ?? null;
      const term3 = final?.term3_grade ?? termByKey.get(`${assignment.teacher_id}:${assignment.subject_id}:3`) ?? null;
      const calculated =
        final?.calculated_grade ??
        calculateAnnualGrade({
          term1,
          term2,
          term3,
          weight1: Number(weight.term1_weight),
          weight2: Number(weight.term2_weight),
          weight3: Number(weight.term3_weight)
        });

      return {
        subjectName: subjectsById.get(assignment.subject_id) ?? assignment.subject_id,
        term1Grade: term1,
        term2Grade: term2,
        term3Grade: term3,
        weight1: Number(final?.term1_weight ?? weight.term1_weight),
        weight2: Number(final?.term2_weight ?? weight.term2_weight),
        weight3: Number(final?.term3_weight ?? weight.term3_weight),
        finalGrade: final?.final_grade ?? roundAnnualGrade(calculated),
        finalObservation: final?.final_observation ?? null
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "es"));

  return {
    report: {
      academicYearName: academicYear?.name ?? "2026-2027",
      studentName: `${student.name} ${student.last_name}`,
      courseName: course?.name ?? student.course_id,
      publishedAt: publication?.published_at ?? null,
      rows
    },
    errorMessage: null,
    status: 200
  };
}

export function generateFinalReportPdf(report: FinalReportData) {
  const lines: string[] = [];

  lines.push("q 0.96 0.98 1 rg 0 780 595 62 re f Q");
  drawText(lines, "Colegio Peñafort Platform", 46, 805, 20, true);
  drawText(lines, "Boletín final de curso", 46, 785, 11);
  drawText(lines, `Curso escolar ${report.academicYearName}`, 46, 744, 11);
  drawText(lines, `Alumno: ${report.studentName}`, 46, 724, 12, true);
  drawText(lines, `Curso: ${report.courseName}`, 46, 704, 11);
  drawText(lines, `Fecha: ${formatDate(new Date().toISOString())}`, 46, 684, 11);
  drawText(lines, `Fecha de publicación: ${report.publishedAt ? formatDate(report.publishedAt) : "Pendiente de publicación"}`, 250, 684, 11);

  lines.push("0.12 0.48 0.65 rg 32 618 531 24 re f");
  drawText(lines, "Asignatura", 42, 625, 9, true, true);
  drawText(lines, "1ª eval.", 165, 625, 9, true, true);
  drawText(lines, "2ª eval.", 215, 625, 9, true, true);
  drawText(lines, "3ª eval.", 265, 625, 9, true, true);
  drawText(lines, "Final", 318, 625, 9, true, true);
  drawText(lines, "Observación final", 370, 625, 9, true, true);

  let y = 592;
  report.rows.forEach((row, index) => {
    if (index % 2 === 0) {
      lines.push("0.97 0.98 0.99 rg 32 " + (y - 8) + " 531 42 re f");
    }

    drawText(lines, row.subjectName, 42, y + 14, 9);
    drawText(lines, formatTerm(row.term1Grade, row.weight1), 165, y + 14, 8);
    drawText(lines, formatTerm(row.term2Grade, row.weight2), 215, y + 14, 8);
    drawText(lines, formatTerm(row.term3Grade, row.weight3), 265, y + 14, 8);
    drawText(lines, row.finalGrade === null ? "-" : String(row.finalGrade), 326, y + 14, 11, true);
    wrapText(row.finalObservation || "Sin observación", 33).slice(0, 2).forEach((line, lineIndex) => {
      drawText(lines, line, 370, y + 14 - lineIndex * 12, 8);
    });
    lines.push("0.85 0.88 0.91 RG 32 " + (y - 10) + " 531 0.5 w S");
    y -= 44;
  });

  if (report.rows.length === 0) {
    drawText(lines, "No hay materias configuradas para este alumno.", 42, y + 14, 10);
  }

  drawText(lines, "Este boletín incluye únicamente evaluaciones trimestrales, nota final y observación final de curso.", 46, 54, 8);

  return buildPdf(lines.join("\n"));
}

function formatTerm(grade: number | null, weight: number) {
  return `${grade ?? "-"} (${weight}%)`;
}

function drawText(lines: string[], text: string, x: number, y: number, size: number, bold = false, white = false) {
  lines.push(`${white ? "1 1 1 rg" : "0.05 0.12 0.22 rg"} BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
}

function wrapText(text: string, maxLength: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function buildPdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`
  ];
  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "latin1"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "latin1");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(""), "latin1");
}

function escapePdfText(text: string) {
  return text
    .replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
