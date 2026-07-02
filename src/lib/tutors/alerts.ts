import { getTutorUnreadCommunicationsCount } from "@/lib/communications/notifications";
import { createClient } from "@/lib/supabase/server";
import { getStudentsForTutor, type TutorStudent } from "@/lib/tutors/students";

export type TutorAlertSeverity = "info" | "warning" | "danger";

export type TutorAlert = {
  id: string;
  title: string;
  description: string;
  studentId?: string;
  studentName?: string;
  severity: TutorAlertSeverity;
};

type AttendanceAlertRow = {
  student_id: string;
  status: "present" | "absent" | "late";
  justified: boolean;
};

type IncidentAlertRow = {
  student_id: string;
};

type GradeAlertRow = {
  student_id: string;
  grade: number;
  assessment_name: string;
};

type ObservationAlertRow = {
  student_id: string;
  title: string;
};

export async function getTutorAlerts(tutorId: string): Promise<{
  alerts: TutorAlert[];
  errorMessage: string | null;
}> {
  const { students, errorMessage } = await getStudentsForTutor(tutorId);

  if (errorMessage) {
    return { alerts: [], errorMessage };
  }

  if (students.length === 0) {
    return { alerts: [], errorMessage: null };
  }

  const supabase = await createClient();
  const studentIds = students.map((student) => student.id);
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [
    { data: attendance, error: attendanceError },
    { data: incidents, error: incidentsError },
    { data: grades, error: gradesError },
    { data: observations, error: observationsError },
    { count: unreadCommunications, errorMessage: communicationsError }
  ] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("student_id,status,justified")
      .in("student_id", studentIds)
      .in("status", ["absent", "late"])
      .returns<AttendanceAlertRow[]>(),
    supabase
      .from("student_incidents")
      .select("student_id")
      .eq("tutor_id", tutorId)
      .gte("created_at", since.toISOString())
      .returns<IncidentAlertRow[]>(),
    supabase
      .from("partial_grades")
      .select("student_id,grade,assessment_name")
      .eq("teacher_id", tutorId)
      .in("student_id", studentIds)
      .lt("grade", 5)
      .returns<GradeAlertRow[]>(),
    supabase
      .from("student_observations")
      .select("student_id,title")
      .eq("tutor_id", tutorId)
      .eq("priority", "alta")
      .in("student_id", studentIds)
      .returns<ObservationAlertRow[]>(),
    getTutorUnreadCommunicationsCount(tutorId)
  ]);

  const firstError =
    attendanceError?.message ??
    incidentsError?.message ??
    gradesError?.message ??
    observationsError?.message ??
    communicationsError;

  if (firstError) {
    return { alerts: [], errorMessage: firstError };
  }

  const studentsById = new Map(students.map((student) => [student.id, student]));
  const alerts: TutorAlert[] = [
    ...buildAbsenceAlerts(attendance ?? [], studentsById),
    ...buildIncidentAlerts(incidents ?? [], studentsById),
    ...buildGradeAlerts(grades ?? [], studentsById),
    ...buildObservationAlerts(observations ?? [], studentsById)
  ];

  if (unreadCommunications > 0) {
    alerts.push({
      id: "unread-family-communications",
      title: "Comunicaciones no leídas",
      description: `${unreadCommunications} comunicación${unreadCommunications === 1 ? "" : "es"} pendiente${unreadCommunications === 1 ? "" : "s"} de lectura por familias.`,
      severity: "warning"
    });
  }

  return {
    alerts: alerts.slice(0, 8),
    errorMessage: null
  };
}

function buildAbsenceAlerts(rows: AttendanceAlertRow[], studentsById: Map<string, TutorStudent>) {
  const counts = new Map<string, number>();

  rows
    .filter((row) => row.status === "absent")
    .forEach((row) => counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1));

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 3)
    .map(([studentId, count]) => {
      const student = studentsById.get(studentId);

      return {
        id: `absences-${studentId}`,
        title: "Absentismo acumulado",
        description: `${count} faltas acumuladas.`,
        studentId,
        studentName: formatStudent(student, studentId),
        severity: "danger" as const
      };
    });
}

function buildIncidentAlerts(rows: IncidentAlertRow[], studentsById: Map<string, TutorStudent>) {
  const counts = new Map<string, number>();

  rows.forEach((row) => counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1));

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([studentId, count]) => {
      const student = studentsById.get(studentId);

      return {
        id: `incidents-${studentId}`,
        title: "Incidencias recientes",
        description: `${count} incidencias registradas en los últimos 7 días.`,
        studentId,
        studentName: formatStudent(student, studentId),
        severity: "warning" as const
      };
    });
}

function buildGradeAlerts(rows: GradeAlertRow[], studentsById: Map<string, TutorStudent>) {
  return rows.map((row) => {
    const student = studentsById.get(row.student_id);

    return {
      id: `grade-${row.student_id}-${row.assessment_name}`,
      title: "Nota inferior a 5",
      description: `${row.assessment_name}: ${row.grade}.`,
      studentId: row.student_id,
      studentName: formatStudent(student, row.student_id),
      severity: "warning" as const
    };
  });
}

function buildObservationAlerts(rows: ObservationAlertRow[], studentsById: Map<string, TutorStudent>) {
  return rows.map((row) => {
    const student = studentsById.get(row.student_id);

    return {
      id: `observation-${row.student_id}-${row.title}`,
      title: "Observación interna alta",
      description: row.title,
      studentId: row.student_id,
      studentName: formatStudent(student, row.student_id),
      severity: "danger" as const
    };
  });
}

function formatStudent(student: TutorStudent | undefined, fallback: string) {
  return student ? `${student.name} ${student.last_name}` : fallback;
}
