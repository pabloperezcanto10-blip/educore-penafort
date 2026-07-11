import {
  TutorDashboardView,
  buildTutorActivityItems,
  countAssignedCourses,
  productionTutorDashboardRoutes,
  tutorDashboardTabs,
  type TutorDashboardTab
} from "@/components/dashboards/tutor/tutor-dashboard-view";
import { requireRole } from "@/lib/auth/session";
import { getRegisteredScheduleIdsForDate } from "@/lib/attendance/session-attendance";
import { getDashboardCalendarEvents } from "@/lib/calendar/ical";
import { getTutorUnreadCommunicationsCount } from "@/lib/communications/notifications";
import { getSubjectCoursesForTeacher } from "@/lib/grades/grades";
import { getDashboardNotifications } from "@/lib/internal-notifications";
import { penafortBrand } from "@/lib/branding/brand-config";
import { getTeacherScheduleForToday } from "@/lib/tutors/schedule";

type TutorDashboardPageProps = {
  searchParams?: {
    work_tab?: string;
  };
};

export default async function TutorDashboardPage({ searchParams }: TutorDashboardPageProps) {
  const profile = await requireRole("tutor");
  const activeTab = normalizeWorkTab(searchParams?.work_tab);
  const [
    { items: subjectCourses, errorMessage: subjectsError },
    { count: unreadCommunications, errorMessage: communicationsError },
    { notifications: dashboardNotifications, unreadCount, errorMessage: dashboardNotificationsError },
    { slots: todaySchedule, weekday, errorMessage: scheduleError },
    { todayEvents, upcomingEvents, errorMessage: calendarError }
  ] = await Promise.all([
    getSubjectCoursesForTeacher(profile.id),
    getTutorUnreadCommunicationsCount(profile.id),
    getDashboardNotifications({
      userId: profile.id,
      role: "tutor",
      communicationHref: productionTutorDashboardRoutes.communications
    }),
    getTeacherScheduleForToday(profile.id),
    getDashboardCalendarEvents()
  ]);
  const { registeredScheduleIds, errorMessage: scheduleRegistrationError } = await getRegisteredScheduleIdsForDate({
    teacherId: profile.id,
    scheduleIds: todaySchedule.filter((slot) => !slot.is_break).map((slot) => slot.id)
  });
  const errorMessage = subjectsError ?? communicationsError ?? dashboardNotificationsError ?? scheduleError ?? scheduleRegistrationError ?? calendarError;
  const tutorName = profile.full_name ?? profile.email ?? "tutor";
  const teachingSlots = todaySchedule.filter((slot) => !slot.is_break);
  const pendingAttendance = teachingSlots.filter((slot) => !registeredScheduleIds.has(slot.id)).length;

  return (
    <TutorDashboardView
      activeTab={activeTab}
      brand={penafortBrand}
      mode="production"
      routes={productionTutorDashboardRoutes}
      data={{
        activityItems: buildTutorActivityItems(dashboardNotifications, todaySchedule, registeredScheduleIds),
        assignedCourseCount: countAssignedCourses(subjectCourses),
        calendarError,
        dashboardNotifications,
        errorMessage,
        pendingAttendance,
        registeredScheduleIds: Array.from(registeredScheduleIds),
        subjectCourses,
        teachingSlotsCount: teachingSlots.length,
        todayEvents,
        todaySchedule,
        tutorName,
        unreadCommunications,
        unreadCount,
        upcomingEvents,
        weekday
      }}
    />
  );
}

function normalizeWorkTab(tab?: string): TutorDashboardTab {
  return tutorDashboardTabs.some((item) => item.id === tab) ? (tab as TutorDashboardTab) : "pendientes";
}
