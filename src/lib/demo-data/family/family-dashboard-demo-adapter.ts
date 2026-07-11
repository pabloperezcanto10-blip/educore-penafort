import type { FamilyDashboardData } from "@/components/dashboards/family/family-dashboard-view";
import type { CalendarEventSummary } from "@/lib/calendar/ical";
import type { FamilyAttendanceRow } from "@/lib/attendance/attendance";
import type { FamilyNotification } from "@/lib/communications/notifications";
import type { GradeWithLabels } from "@/lib/grades/grades";
import type { DashboardNotification } from "@/lib/internal-notifications";
import { createExperienceMode } from "@/lib/experience/mode";

const baseDate = new Date("2026-07-11T09:00:00+02:00");

export function createFamilyDashboardDemoData(): FamilyDashboardData {
  createExperienceMode("familia");
  const notifications = createFamilyNotifications();
  const dashboardNotifications = createDashboardNotifications();

  return {
    attendanceRows: createAttendanceRows(),
    calendarError: null,
    dashboardNotifications,
    errorMessage: null,
    familyName: "Familia Romero",
    grades: createGrades(),
    notifications,
    todayEvents: createTodayEvents(),
    unreadCount: dashboardNotifications.filter((notification) => !notification.read).length,
    upcomingEvents: createUpcomingEvents()
  };
}

function createFamilyNotifications(): FamilyNotification[] {
  return [
    {
      id: "demo-family-message-1",
      sender_id: "demo-teacher-irene-soler",
      student_id: "demo-student-lucia-romero",
      title: "Seguimiento semanal",
      message: "La tutora ha compartido un resumen de hábitos de estudio.",
      category: "general",
      read: false,
      read_at: null,
      status: "open",
      created_at: isoMinutesAgo(22),
      students: {
        name: "Lucía",
        last_name: "Romero"
      }
    },
    {
      id: "demo-family-message-2",
      sender_id: "demo-school-office",
      student_id: "demo-student-lucia-romero",
      title: "Recordatorio de salida",
      message: "Autorización pendiente para la actividad de ciencias.",
      category: "general",
      read: true,
      read_at: isoMinutesAgo(60),
      status: "open",
      created_at: isoMinutesAgo(180),
      students: {
        name: "Lucía",
        last_name: "Romero"
      }
    }
  ];
}

function createDashboardNotifications(): DashboardNotification[] {
  return [
    {
      id: "demo-dashboard-family-1",
      source: "communication",
      title: "Respuesta de la tutora",
      body: "Irene Soler ha respondido a vuestra consulta sobre matemáticas.",
      href: "/experience/familia",
      read: false,
      created_at: isoMinutesAgo(22)
    },
    {
      id: "demo-dashboard-family-2",
      source: "internal",
      title: "Boletín disponible",
      body: "Ya podéis consultar las calificaciones visibles de la evaluación.",
      href: "/experience/familia",
      read: false,
      created_at: isoMinutesAgo(95)
    }
  ];
}

function createAttendanceRows(): FamilyAttendanceRow[] {
  return [
    {
      id: "demo-attendance-family-1",
      student_id: "demo-student-lucia-romero",
      tutor_id: "demo-teacher-irene-soler",
      status: "late",
      date: "2026-07-08",
      notes: "Entrada registrada a las 09:14.",
      justified: false,
      justification_text: null,
      justification_file_url: null,
      created_at: isoMinutesAgo(3200),
      students: {
        name: "Lucía",
        last_name: "Romero"
      }
    },
    {
      id: "demo-attendance-family-2",
      student_id: "demo-student-lucia-romero",
      tutor_id: "demo-teacher-irene-soler",
      status: "absent",
      date: "2026-07-03",
      notes: "Ausencia comunicada por la familia.",
      justified: true,
      justification_text: "Cita médica familiar.",
      justification_file_url: null,
      created_at: isoMinutesAgo(7200),
      students: {
        name: "Lucía",
        last_name: "Romero"
      }
    }
  ];
}

function createGrades(): GradeWithLabels[] {
  return [
    createGrade("demo-grade-1", "Matemáticas", "Resolución de problemas", 8.4, "Buen progreso en estrategias de cálculo."),
    createGrade("demo-grade-2", "Ciencias", "Proyecto de ecosistemas", 9.1, "Trabajo muy completo y bien presentado."),
    createGrade("demo-grade-3", "Lengua", "Comprensión lectora", 7.8, "Conviene seguir reforzando inferencias.")
  ];
}

function createGrade(id: string, subjectName: string, assessmentName: string, grade: number, comment: string): GradeWithLabels {
  return {
    id,
    student_id: "demo-student-lucia-romero",
    teacher_id: "demo-teacher-irene-soler",
    subject_id: `demo-subject-${subjectName.toLowerCase()}`,
    course_id: "demo-course-6a",
    term: "2",
    assessment_type: "parcial",
    assessment_name: assessmentName,
    grade,
    assessment_date: "2026-07-05",
    comment,
    recommendation: null,
    visible_to_family: true,
    created_at: isoMinutesAgo(5000),
    studentName: "Lucía Romero",
    subjectName,
    teacherName: "Irene Soler"
  };
}

function createTodayEvents(): CalendarEventSummary[] {
  return [
    {
      id: "demo-family-calendar-1",
      title: "Tutoría individual",
      startsAt: addMinutes(baseDate, 330),
      allDay: false
    }
  ];
}

function createUpcomingEvents(): CalendarEventSummary[] {
  return [
    {
      id: "demo-family-calendar-2",
      title: "Actividad de ciencias",
      startsAt: addDays(baseDate, 2),
      allDay: true
    },
    {
      id: "demo-family-calendar-3",
      title: "Publicación de boletines",
      startsAt: addDays(baseDate, 4),
      allDay: true
    }
  ];
}

function isoMinutesAgo(minutes: number) {
  return new Date(baseDate.getTime() - minutes * 60 * 1000).toISOString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
