import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { getTodayDate } from "@/lib/attendance/attendance";
import type { TeacherScheduleSlot } from "@/lib/tutors/schedule";

export type SessionAttendanceStatus = "present" | "absent" | "late" | "justified";

export type SessionAttendanceRecord = {
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
  updated_at: string;
};

export type SessionAttendanceStudent = {
  id: string;
  name: string;
  last_name: string;
};

export type SessionAttendanceRow = {
  student: SessionAttendanceStudent;
  record: SessionAttendanceRecord | null;
  status: SessionAttendanceStatus;
  notes: string;
};

export type SessionAttendanceContext = {
  schedule: TeacherScheduleSlot;
  course: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
  } | null;
  rows: SessionAttendanceRow[];
  date: string;
};

const subjectAliases: Record<string, string> = {
  Math: "Matemáticas",
  Science: "Ciencias"
};

export function getSessionAttendanceLabel(status: SessionAttendanceStatus) {
  const labels: Record<SessionAttendanceStatus, string> = {
    present: "Presente",
    absent: "Ausente",
    late: "Retraso",
    justified: "Justificado"
  };

  return labels[status];
}

export async function getSessionAttendanceContext({
  teacherId,
  sessionId,
  date = getTodayDate()
}: {
  teacherId: string;
  sessionId: string;
  date?: string;
}): Promise<{
  context: SessionAttendanceContext | null;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear();

  if (!academicYear) {
    return { context: null, errorMessage: "No hay curso escolar activo." };
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("teacher_schedule")
    .select("id,teacher_id,weekday,start_time,end_time,course_name,subject_name,is_break,created_at")
    .eq("id", sessionId)
    .eq("teacher_id", teacherId)
    .maybeSingle<TeacherScheduleSlot>();

  if (scheduleError) {
    return { context: null, errorMessage: scheduleError.message };
  }

  if (!schedule || schedule.is_break) {
    return { context: null, errorMessage: "No se encontro una sesion lectiva para este docente." };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,name")
    .eq("name", schedule.course_name)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle<{ id: string; name: string }>();

  if (courseError) {
    return { context: null, errorMessage: courseError.message };
  }

  if (!course) {
    return { context: null, errorMessage: "No se encontro el curso asociado a la sesion." };
  }

  const subjectName = schedule.subject_name ? (subjectAliases[schedule.subject_name] ?? schedule.subject_name) : null;
  const subject = subjectName ? await findSubjectByName(subjectName) : null;

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id,name,last_name")
    .eq("course_id", course.id)
    .eq("academic_year_id", academicYear.id)
    .eq("active", true)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true })
    .returns<SessionAttendanceStudent[]>();

  if (studentsError) {
    return { context: null, errorMessage: studentsError.message };
  }

  const studentRows = students ?? [];
  const studentIds = studentRows.map((student) => student.id);
  const records = studentIds.length > 0
    ? await getSessionAttendanceRecords({ scheduleId: sessionId, date, studentIds })
    : { records: [], errorMessage: null };

  if (records.errorMessage) {
    return { context: null, errorMessage: records.errorMessage };
  }

  const recordsByStudent = new Map(records.records.map((record) => [record.student_id, record]));

  return {
    errorMessage: null,
    context: {
      schedule,
      course,
      subject,
      date,
      rows: studentRows.map((student) => {
        const record = recordsByStudent.get(student.id) ?? null;

        return {
          student,
          record,
          status: record?.status ?? "present",
          notes: record?.notes ?? ""
        };
      })
    }
  };
}

export async function getRegisteredScheduleIdsForDate({
  teacherId,
  scheduleIds,
  date = getTodayDate()
}: {
  teacherId: string;
  scheduleIds: string[];
  date?: string;
}) {
  if (scheduleIds.length === 0) {
    return { registeredScheduleIds: new Set<string>(), errorMessage: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_records")
    .select("schedule_id")
    .eq("teacher_id", teacherId)
    .eq("attendance_date", date)
    .in("schedule_id", scheduleIds)
    .returns<{ schedule_id: string | null }[]>();

  if (error) {
    if (error.message.includes("attendance_records")) {
      return { registeredScheduleIds: new Set<string>(), errorMessage: null };
    }

    return { registeredScheduleIds: new Set<string>(), errorMessage: error.message };
  }

  return {
    registeredScheduleIds: new Set((data ?? []).map((record) => record.schedule_id).filter((id): id is string => Boolean(id))),
    errorMessage: null
  };
}

async function getSessionAttendanceRecords({
  scheduleId,
  date,
  studentIds
}: {
  scheduleId: string;
  date: string;
  studentIds: string[];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_records")
    .select("id,student_id,teacher_id,course_id,subject_id,schedule_id,attendance_date,status,notes,created_at,updated_at")
    .eq("schedule_id", scheduleId)
    .eq("attendance_date", date)
    .in("student_id", studentIds)
    .returns<SessionAttendanceRecord[]>();

  if (error) {
    return { records: [], errorMessage: error.message };
  }

  return { records: data ?? [], errorMessage: null };
}

async function findSubjectByName(subjectName: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id,name")
    .eq("name", subjectName)
    .maybeSingle<{ id: string; name: string }>();

  return data ?? null;
}
