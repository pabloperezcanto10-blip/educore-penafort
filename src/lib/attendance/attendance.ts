import { createClient } from "@/lib/supabase/server";
import { getStudentsForTutor, type TutorStudent } from "@/lib/tutors/students";

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

export type TutorAttendanceRow = {
  student: TutorStudent;
  attendance: AttendanceRecord | null;
  status: AttendanceStatus;
  notes: string;
};

export type StudentAttendanceSummary = {
  absences: number;
  lates: number;
  history: AttendanceRecord[];
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function getAttendanceLabel(status: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    present: "Presente",
    absent: "Falta",
    late: "Retraso"
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_attendance")
    .select("id,student_id,tutor_id,status,date,notes,justified,justification_text,justification_file_url,created_at")
    .eq("student_id", studentId)
    .eq("tutor_id", tutorId)
    .order("date", { ascending: false })
    .returns<AttendanceRecord[]>();

  if (error) {
    return {
      summary: { absences: 0, lates: 0, history: [] },
      errorMessage: error.message
    };
  }

  const history = data ?? [];

  return {
    errorMessage: null,
    summary: {
      absences: history.filter((record) => record.status === "absent").length,
      lates: history.filter((record) => record.status === "late").length,
      history
    }
  };
}

export async function getFamilyAttendance(familyId: string): Promise<{
  rows: FamilyAttendanceRow[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data: relations, error: relationsError } = await supabase
    .from("parent_students")
    .select("student_id")
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
  const supabase = await createClient();
  const { data: attendance, error } = await supabase
    .from("student_attendance")
    .select("id,student_id,tutor_id,status,date,notes,justified,justification_text,justification_file_url,created_at")
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

  const studentIds = Array.from(new Set(records.map((record) => record.student_id)));
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id,name,last_name")
    .in("id", studentIds)
    .returns<AttendanceStudent[]>();

  if (studentsError) {
    return { rows: [], errorMessage: studentsError.message };
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
