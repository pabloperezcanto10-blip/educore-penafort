import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { getStudentsForTutor, type TutorStudent } from "@/lib/tutors/students";
import { requireSchoolRole } from "@/lib/schools/context";
import { getMadridDate } from "@/lib/date-time/madrid";

export type AttendanceStatus = "present" | "absent" | "late";

export type AttendanceRecord = {
  id: string;
  student_id: string;
  tutor_id: string;
  status: AttendanceStatus;
  date: string;
  notes: string | null;
  justified: boolean;
  justification_text: string | null;
  justification_file_url: string | null;
  created_at: string;
};

export type StudentProfileAttendanceStatus = AttendanceStatus | "justified";

export type StudentProfileAttendanceRecord = {
  id: string;
  student_id: string;
  teacher_id: string;
  course_id: string;
  subject_id: string | null;
  schedule_id: string | null;
  attendance_date: string;
  status: StudentProfileAttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TutorAttendanceRow = {
  student: TutorStudent;
  attendance: AttendanceRecord | null;
  status: AttendanceStatus;
  notes: string;
};

export type StudentAttendanceSummary = {
  days: number;
  records: number;
  present: number;
  absences: number;
  lates: number;
  justified: number;
  history: StudentProfileAttendanceRecord[];
};

export type FamilyAttendanceRow = AttendanceRecord & {
  students: {
    name: string;
    last_name: string;
  } | null;
};

export type DirectorAttendanceRow = AttendanceRecord & {
  studentName: string;
};

type AttendanceStudent = {
  id: string;
  name: string;
  last_name: string;
};

export function getTodayDate() {
  return getMadridDate();
}

export function getAttendanceLabel(status: StudentProfileAttendanceStatus) {
  const labels: Record<StudentProfileAttendanceStatus, string> = {
    present: "Presente",
    absent: "Falta",
    late: "Retraso",
    justified: "Justificado"
  };

  return labels[status];
}

export async function getTutorAttendanceForDate(
  tutorId: string,
  date = getTodayDate()
): Promise<{
  rows: TutorAttendanceRow[];
  date: string;
  errorMessage: string | null;
}> {
  const { students, errorMessage } = await getStudentsForTutor(tutorId);

  if (errorMessage) {
    return { rows: [], date, errorMessage };
  }

  if (students.length === 0) {
    return { rows: [], date, errorMessage: null };
  }

  const supabase = await createClient();
  const studentIds = students.map((student) => student.id);
  const { data, error } = await supabase
    .from("student_attendance")
    .select("id,student_id,tutor_id,status,date,notes,justified,justification_text,justification_file_url,created_at")
    .eq("date", date)
    .in("student_id", studentIds)
    .returns<AttendanceRecord[]>();

  if (error) {
    return { rows: [], date, errorMessage: error.message };
  }

  const attendanceByStudent = new Map((data ?? []).map((record) => [record.student_id, record]));

  return {
    date,
    errorMessage: null,
    rows: students.map((student) => {
      const attendance = attendanceByStudent.get(student.id) ?? null;

      return {
        student,
        attendance,
        status: attendance?.status ?? "present",
        notes: attendance?.notes ?? ""
      };
    })
  };
}

export async function getStudentAttendanceSummary(
  studentId: string,
  tutorId: string
): Promise<{
  summary: StudentAttendanceSummary;
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["tutor"]);
  if (!schoolContext.schoolId) {
    return {
      summary: emptyStudentAttendanceSummary(),
      errorMessage: "No hay un centro activo seleccionado."
    };
  }

  const supabase = await createClient();
  const { academicYear, errorMessage: academicYearError } = await getActiveAcademicYear(
    schoolContext.schoolId
  );

  if (academicYearError || !academicYear) {
    return {
      summary: emptyStudentAttendanceSummary(),
      errorMessage: academicYearError ?? "No hay curso escolar activo."
    };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,course_id")
    .eq("id", studentId)
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYear.id)
    .eq("tutor_teacher_id", tutorId)
    .maybeSingle<{ id: string; course_id: string }>();

  if (studentError || !student) {
    return {
      summary: emptyStudentAttendanceSummary(),
      errorMessage: studentError?.message ?? "El alumno no pertenece al centro activo."
    };
  }

  // The profile is server-rendered and has already verified tutor, tenant and year ownership.
  // An admin client lets the tutor profile include sessions recorded by every assigned teacher.
  const attendanceClient = hasSupabaseAdminClient()
    ? createAdminClient()
    : (supabase as unknown as ReturnType<typeof createAdminClient>);
  let attendanceQuery = attendanceClient
    .from("attendance_records")
    .select("id,student_id,teacher_id,course_id,subject_id,schedule_id,attendance_date,status,notes,created_at,updated_at")
    .eq("student_id", studentId)
    .eq("course_id", student.course_id)
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (academicYear.start_date) {
    attendanceQuery = attendanceQuery.gte("attendance_date", academicYear.start_date);
  }

  if (academicYear.end_date) {
    attendanceQuery = attendanceQuery.lte("attendance_date", academicYear.end_date);
  }

  const { data, error } = await attendanceQuery.returns<StudentProfileAttendanceRecord[]>();

  if (error) {
    return {
      summary: emptyStudentAttendanceSummary(),
      errorMessage: error.message
    };
  }

  const history = data ?? [];

  return {
    errorMessage: null,
    summary: summarizeStudentAttendance(history)
  };
}

export function summarizeStudentAttendance(
  history: StudentProfileAttendanceRecord[]
): StudentAttendanceSummary {
  return {
    days: new Set(history.map((record) => record.attendance_date)).size,
    records: history.length,
    present: history.filter((record) => record.status === "present").length,
    absences: history.filter((record) => record.status === "absent").length,
    lates: history.filter((record) => record.status === "late").length,
    justified: history.filter((record) => record.status === "justified").length,
    history
  };
}

function emptyStudentAttendanceSummary(): StudentAttendanceSummary {
  return summarizeStudentAttendance([]);
}

export async function getFamilyAttendance(familyId: string): Promise<{
  rows: FamilyAttendanceRow[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["family"]);
  if (!schoolContext.schoolId) {
    return { rows: [], errorMessage: "No hay un centro activo seleccionado." };
  }

  const supabase = await createClient();
  const { data: relations, error: relationsError } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("school_id", schoolContext.schoolId)
    .eq("parent_id", familyId)
    .returns<{ student_id: string }[]>();

  if (relationsError) {
    return { rows: [], errorMessage: relationsError.message };
  }

  const studentIds = (relations ?? []).map((relation) => relation.student_id);

  if (studentIds.length === 0) {
    return { rows: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("student_attendance")
    .select(
      "id,student_id,tutor_id,status,date,notes,justified,justification_text,justification_file_url,created_at,students(name,last_name)"
    )
    .in("student_id", studentIds)
    .neq("status", "present")
    .order("date", { ascending: false })
    .returns<FamilyAttendanceRow[]>();

  if (error) {
    return { rows: [], errorMessage: error.message };
  }

  return {
    rows: data ?? [],
    errorMessage: null
  };
}

export async function getDirectorAttendance(): Promise<{
  rows: DirectorAttendanceRow[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["director"]);
  if (!schoolContext.schoolId) {
    return { rows: [], errorMessage: "No hay un centro activo seleccionado." };
  }

  const supabase = await createClient();
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id,name,last_name")
    .eq("school_id", schoolContext.schoolId)
    .returns<AttendanceStudent[]>();

  if (studentsError) {
    return { rows: [], errorMessage: studentsError.message };
  }

  const studentIds = (students ?? []).map(({ id }) => id);
  if (studentIds.length === 0) {
    return { rows: [], errorMessage: null };
  }

  const { data: attendance, error } = await supabase
    .from("student_attendance")
    .select("id,student_id,tutor_id,status,date,notes,justified,justification_text,justification_file_url,created_at")
    .in("student_id", studentIds)
    .in("status", ["absent", "late"])
    .order("date", { ascending: false })
    .returns<AttendanceRecord[]>();

  if (error) {
    return { rows: [], errorMessage: error.message };
  }

  const records = attendance ?? [];

  if (records.length === 0) {
    return { rows: [], errorMessage: null };
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));

  return {
    rows: records.map((record) => {
      const student = studentsById.get(record.student_id);

      return {
        ...record,
        studentName: student ? `${student.name} ${student.last_name}` : record.student_id
      };
    }),
    errorMessage: null
  };
}

export function getAbsenceAlerts(rows: DirectorAttendanceRow[]) {
  const counts = new Map<string, { studentName: string; count: number }>();

  rows
    .filter((row) => row.status === "absent")
    .forEach((row) => {
      const current = counts.get(row.student_id) ?? {
        studentName: row.studentName,
        count: 0
      };
      counts.set(row.student_id, {
        ...current,
        count: current.count + 1
      });
    });

  return Array.from(counts.values()).filter((item) => item.count >= 3);
}
