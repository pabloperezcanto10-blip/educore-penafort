import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/session";
import type { GradeTerm } from "@/lib/grades/grades";

type ReportClient = Awaited<ReturnType<typeof createClient>>;

export type TermReportData = {
  academicYearName: string;
  studentName: string;
  courseName: string;
  term: GradeTerm;
  publishedAt: string | null;
  rows: {
    subjectName: string;
    finalGrade: number;
    finalObservation: string | null;
  }[];
};

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

type TermSubjectGradeRow = {
  subject_id: string;
  final_grade: number | null;
  final_observation: string | null;
  status: "draft" | "closed";
};

type SubjectRow = {
  id: string;
  name: string;
};

export async function getTermReportForProfile({
  profile,
  studentId,
  term
}: {
  profile: Profile;
  studentId: string;
  term: GradeTerm;
}): Promise<{ report: TermReportData | null; errorMessage: string | null; status: number }> {
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
    { data: grades, error: gradesError }
  ] = await Promise.all([
    supabase.from("courses").select("id,name").eq("id", student.course_id).maybeSingle<CourseRow>(),
    supabase.from("academic_years").select("id,name").eq("id", student.academic_year_id).maybeSingle<AcademicYearRow>(),
    supabase
      .from("evaluation_publications")
      .select("published,published_at")
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .eq("term", term)
      .maybeSingle<PublicationRow>(),
    supabase
      .from("term_subject_grades")
      .select("subject_id,final_grade,final_observation,status")
      .eq("student_id", studentId)
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .eq("term", term)
      .eq("status", "closed")
      .returns<TermSubjectGradeRow[]>()
  ]);

  const queryError = courseError?.message ?? academicYearError?.message ?? publicationError?.message ?? gradesError?.message ?? null;
  if (queryError) return { report: null, errorMessage: queryError, status: 500 };

  if (profile.role === "family" && !publication?.published) {
    return { report: null, errorMessage: "El boletín de esta evaluación todavía no está disponible.", status: 403 };
  }

  const validGrades: TermSubjectGradeRow[] = (grades ?? []).filter((grade: TermSubjectGradeRow) => grade.final_grade !== null);
  const subjectIds = Array.from(new Set(validGrades.map((grade: TermSubjectGradeRow) => grade.subject_id)));
  const { data: subjects, error: subjectsError } = subjectIds.length
    ? await supabase.from("subjects").select("id,name").in("id", subjectIds).returns<SubjectRow[]>()
    : { data: [], error: null };

  if (subjectsError) return { report: null, errorMessage: subjectsError.message, status: 500 };

  const subjectsById = new Map((subjects ?? []).map((subject: SubjectRow) => [subject.id, subject.name]));
  const rows = validGrades
    .map((grade: TermSubjectGradeRow) => ({
      subjectName: subjectsById.get(grade.subject_id) ?? grade.subject_id,
      finalGrade: Number(grade.final_grade),
      finalObservation: grade.final_observation
    }))
    .sort((a: TermReportData["rows"][number], b: TermReportData["rows"][number]) => a.subjectName.localeCompare(b.subjectName, "es"));

  return {
    report: {
      academicYearName: academicYear?.name ?? "2026-2027",
      studentName: `${student.name} ${student.last_name}`,
      courseName: course?.name ?? student.course_id,
      term,
      publishedAt: publication?.published_at ?? null,
      rows
    },
    errorMessage: null,
    status: 200
  };
}

export function generateTermReportPdf(report: TermReportData) {
  const lines: string[] = [];

  lines.push("q 0.96 0.98 1 rg 0 780 595 62 re f Q");
  drawText(lines, "Colegio Peñafort Platform", 46, 805, 20, true);
  drawText(lines, "Boletín trimestral oficial", 46, 785, 11);
  drawText(lines, `Curso escolar ${report.academicYearName}`, 46, 744, 11);
  drawText(lines, `Alumno: ${report.studentName}`, 46, 724, 12, true);
  drawText(lines, `Curso: ${report.courseName}`, 46, 704, 11);
  drawText(lines, `Trimestre: ${report.term}`, 320, 704, 11);
  drawText(lines, `Fecha de publicación: ${report.publishedAt ? formatDate(report.publishedAt) : "Pendiente de publicación"}`, 46, 684, 11);

  const tableTop = 640;
  lines.push("0.12 0.48 0.65 rg 46 618 503 24 re f");
  drawText(lines, "Asignatura", 58, 625, 10, true, true);
  drawText(lines, "Nota final", 258, 625, 10, true, true);
  drawText(lines, "Observación final", 342, 625, 10, true, true);

  let y = tableTop - 48;
  report.rows.forEach((row, index) => {
    if (index % 2 === 0) {
      lines.push("0.97 0.98 0.99 rg 46 " + (y - 6) + " 503 40 re f");
    }

    drawText(lines, row.subjectName, 58, y + 14, 10);
    drawText(lines, String(row.finalGrade), 278, y + 14, 11, true);
    wrapText(row.finalObservation || "Sin observación", 42).slice(0, 2).forEach((line, lineIndex) => {
      drawText(lines, line, 342, y + 14 - lineIndex * 12, 9);
    });
    lines.push("0.85 0.88 0.91 RG 46 " + (y - 8) + " 503 0.5 w S");
    y -= 42;
  });

  if (report.rows.length === 0) {
    drawText(lines, "No hay notas finales cerradas para este trimestre.", 58, y + 14, 10);
  }

  drawText(lines, "Este boletín incluye únicamente asignatura, nota final entera y observación final.", 46, 54, 8);

  return buildPdf(lines.join("\n"));
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
