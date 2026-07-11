import { buildTutorActivityItems, countAssignedCourses, type TutorDashboardData, type TutorDashboardTab } from "@/components/dashboards/tutor/tutor-dashboard-view";
import type { CalendarEventSummary } from "@/lib/calendar/ical";
import type { TeacherSubjectCourse } from "@/lib/grades/grades";
import type { DashboardNotification } from "@/lib/internal-notifications";
import type { TeacherScheduleSlot } from "@/lib/tutors/schedule";
import { createExperienceMode } from "@/lib/experience/mode";

const baseDate = new Date("2026-07-11T09:00:00+02:00");
const teacherId = "demo-teacher-irene-soler";

export function createTutorDashboardDemoData(_activeTab: TutorDashboardTab = "pendientes"): TutorDashboardData {
  createExperienceMode("docente");
  const subjectCourses = createSubjectCourses();
  const todaySchedule = createTodaySchedule();
  const registeredScheduleIds = new Set(["demo-schedule-1"]);
  const dashboardNotifications = createNotifications();
  const teachingSlots = todaySchedule.filter((slot) => !slot.is_break);
  const todayEvents = createTodayEvents();
  const upcomingEvents = createUpcomingEvents();

  return {
    activityItems: buildTutorActivityItems(dashboardNotifications, todaySchedule, registeredScheduleIds),
    assignedCourseCount: countAssignedCourses(subjectCourses),
    calendarError: null,
    dashboardNotifications,
    errorMessage: null,
    pendingAttendance: teachingSlots.filter((slot) => !registeredScheduleIds.has(slot.id)).length,
    registeredScheduleIds: Array.from(registeredScheduleIds),
    subjectCourses,
    teachingSlotsCount: teachingSlots.length,
    todayEvents,
    todaySchedule,
    tutorName: "Irene Soler",
    unreadCommunications: dashboardNotifications.filter((notification) => notification.source === "communication" && !notification.read).length,
    unreadCount: dashboardNotifications.filter((notification) => !notification.read).length,
    upcomingEvents,
    weekday: 1
  };
}

function createSubjectCourses(): TeacherSubjectCourse[] {
  return [
    {
      subject: { id: "demo-subject-math", name: "Matemáticas" },
      courses: [
        { id: "demo-course-6a", name: "6º Primaria A" },
        { id: "demo-course-6b", name: "6º Primaria B" },
        { id: "demo-course-1eso", name: "1º ESO" }
      ]
    },
    {
      subject: { id: "demo-subject-science", name: "Ciencias" },
      courses: [
        { id: "demo-course-5a", name: "5º Primaria A" },
        { id: "demo-course-6a", name: "6º Primaria A" }
      ]
    },
    {
      subject: { id: "demo-subject-tutoring", name: "Tutoría" },
      courses: [
        { id: "demo-course-6a", name: "6º Primaria A" }
      ]
    }
  ];
}

function createTodaySchedule(): TeacherScheduleSlot[] {
  return [
    createSlot("demo-schedule-1", "09:00:00", "09:55:00", "6º Primaria A", "Matemáticas"),
    createSlot("demo-schedule-break", "09:55:00", "10:20:00", "Descanso", null, true),
    createSlot("demo-schedule-2", "10:20:00", "11:15:00", "5º Primaria A", "Ciencias"),
    createSlot("demo-schedule-3", "11:30:00", "12:25:00", "6º Primaria B", "Matemáticas"),
    createSlot("demo-schedule-4", "12:30:00", "13:20:00", "6º Primaria A", "Tutoría")
  ];
}

function createSlot(id: string, start: string, end: string, courseName: string, subjectName: string | null, isBreak = false): TeacherScheduleSlot {
  return {
    id,
    teacher_id: teacherId,
    weekday: 1,
    start_time: start,
    end_time: end,
    course_name: courseName,
    subject_name: subjectName,
    is_break: isBreak,
    created_at: baseDate.toISOString()
  };
}

function createNotifications(): DashboardNotification[] {
  return [
    {
      id: "demo-teacher-notification-1",
      source: "communication",
      title: "Comunicación pendiente",
      body: "Familia Vidal · consulta sobre hábitos de estudio.",
      href: "/experience/docente?work_tab=comunicaciones&demo=communications",
      read: false,
      created_at: isoMinutesAgo(16)
    },
    {
      id: "demo-teacher-notification-2",
      source: "internal",
      title: "Criterio sin completar",
      body: "Matemáticas · 6º Primaria B · 4 alumnos pendientes.",
      href: "/experience/docente?work_tab=cuaderno&demo=gradebook",
      read: false,
      created_at: isoMinutesAgo(44)
    },
    {
      id: "demo-teacher-notification-3",
      source: "communication",
      title: "Respuesta de familia",
      body: "Familia Robles · justificante recibido.",
      href: "/experience/docente?work_tab=comunicaciones&demo=communications",
      read: true,
      created_at: isoMinutesAgo(90)
    }
  ];
}

function createTodayEvents(): CalendarEventSummary[] {
  return [
    {
      id: "demo-teacher-calendar-1",
      title: "Reunión de ciclo",
      startsAt: addMinutes(baseDate, 300),
      allDay: false
    }
  ];
}

function createUpcomingEvents(): CalendarEventSummary[] {
  return [
    {
      id: "demo-teacher-calendar-2",
      title: "Entrega de observaciones finales",
      startsAt: addDays(baseDate, 1),
      allDay: true
    },
    {
      id: "demo-teacher-calendar-3",
      title: "Tutoría con familias",
      startsAt: addDays(baseDate, 2),
      allDay: false
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
