import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { getTodayDate } from "@/lib/attendance/attendance";
import type { SessionAttendanceStatus } from "@/lib/attendance/session-attendance";

export type AttendanceHistoryRow = {
  id: string;
  student_id: string;
  teacher_id: string;
  course_id: string;
  subject_id: string | null;
  schedule_id: string | null;
  attendance_date: string;
  status: SessionAttendanceStatus;
  notes: string | null;
  created_at: string;
  students: {
    name: string;
    last_name: string;
  } | null;
};

export type AttendanceHistorySummary = {
  present: number;
  absent: number;
  late: number;
  justified: number;
};

export async function getTutorAttendanceHistory({
  teacherId,
  courseId,
  subjectId,
  dateFrom,
  dateTo,
  studentId,
  status
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
  dateFrom?: string;
  dateTo?: string;
  studentId?: string;
  status?: string;
}): Promise<{
  rows: AttendanceHistoryRow[];
  summary: AttendanceHistorySummary;
  students: { id: string; name: string; last_name: string }[];
  courseName: string | null;
  subjectName: string | null;
  errorMessage: string | null;
}> {
  if (!courseId || !subjectId) {
    return emptyHistory("Selecciona curso y materia.");
  }

  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear();

  if (!academicYear) {
    return emptyHistory("No hay curso escolar activo.");
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("course_id,subject_id")
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle<{ course_id: string; subject_id: string | null }>();

  if (assignmentError) {
    return emptyHistory(assignmentError.message);
  }

  if (!assignment) {
    return emptyHistory("No tienes acceso a este curso y materia.");
  }

  const [{ data: course }, { data: subject }, { data: students, error: studentsError }] = await Promise.all([
    supabase.from("courses").select("id,name").eq("id", courseId).maybeSingle<{ id: string; name: string }>(),
    supabase.from("subjects").select("id,name").eq("id", subjectId).maybeSingle<{ id: string; name: string }>(),
    supabase
      .from("students")
      .select("id,name,last_name")
      .eq("course_id", courseId)
      .eq("academic_year_id", academicYear.id)
      .eq("active", true)
      .order("last_name", { ascending: true })
      .order("name", { ascending: true })
      .returns<{ id: string; name: string; last_name: string }[]>()
  ]);

  if (studentsError) {
    return emptyHistory(studentsError.message);
  }

  const from = dateFrom || getMonthStart();
  const to = dateTo || getTodayDate();
  let query = supabase
    .from("attendance_records")
    .select("id,student_id,teacher_id,course_id,subject_id,schedule_id,attendance_date,status,notes,created_at,students(name,last_name)")
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .gte("attendance_date", from)
    .lte("attendance_date", to)
    .order("attendance_date", { ascending: false });

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  if (isHistoryStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.returns<AttendanceHistoryRow[]>();

  if (error) {
    return emptyHistory(error.message, students ?? [], course?.name ?? null, subject?.name ?? null);
  }

  const rows = data ?? [];

  return {
    rows,
    students: students ?? [],
    courseName: course?.name ?? null,
    subjectName: subject?.name ?? null,
    summary: {
      present: rows.filter((row) => row.status === "present").length,
      absent: rows.filter((row) => row.status === "absent").length,
      late: rows.filter((row) => row.status === "late").length,
      justified: rows.filter((row) => row.status === "justified").length
    },
    errorMessage: null
  };
}

function emptyHistory(
  errorMessage: string | null,
  students: { id: string; name: string; last_name: string }[] = [],
  courseName: string | null = null,
  subjectName: string | null = null
) {
  return {
    rows: [],
    students,
    courseName,
    subjectName,
    summary: { present: 0, absent: 0, late: 0, justified: 0 },
    errorMessage
  };
}

function getMonthStart() {
  const today = getTodayDate();
  return `${today.slice(0, 8)}01`;
}

function isHistoryStatus(value: string | undefined): value is SessionAttendanceStatus {
  return value === "present" || value === "absent" || value === "late" || value === "justified";
}
