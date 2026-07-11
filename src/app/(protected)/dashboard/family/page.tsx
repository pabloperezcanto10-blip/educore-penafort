import { FamilyDashboardView, productionFamilyDashboardRoutes } from "@/components/dashboards/family/family-dashboard-view";
import { requireRole } from "@/lib/auth/session";
import { getFamilyAttendance } from "@/lib/attendance/attendance";
import { getDashboardCalendarEvents } from "@/lib/calendar/ical";
import { getFamilyNotifications } from "@/lib/communications/notifications";
import { getFamilyGrades } from "@/lib/grades/grades";
import { getDashboardNotifications } from "@/lib/internal-notifications";
import { penafortBrand } from "@/lib/branding/brand-config";

export default async function FamilyDashboardPage() {
  const profile = await requireRole("family");
  const [
    { notifications, errorMessage },
    { rows: attendanceRows, errorMessage: attendanceErrorMessage },
    { grades, errorMessage: gradesErrorMessage },
    { notifications: dashboardNotifications, unreadCount, errorMessage: dashboardNotificationsError },
    { todayEvents, upcomingEvents, errorMessage: calendarError }
  ] = await Promise.all([
    getFamilyNotifications(profile.id),
    getFamilyAttendance(profile.id),
    getFamilyGrades(profile.id),
    getDashboardNotifications({
      userId: profile.id,
      role: "family",
      communicationHref: productionFamilyDashboardRoutes.communications
    }),
    getDashboardCalendarEvents()
  ]);
  const pageError = errorMessage ?? attendanceErrorMessage ?? gradesErrorMessage ?? dashboardNotificationsError ?? calendarError;
  const familyName = profile.full_name ?? profile.email ?? "familia";

  return (
    <FamilyDashboardView
      brand={penafortBrand}
      mode="production"
      routes={productionFamilyDashboardRoutes}
      data={{
        attendanceRows,
        calendarError,
        dashboardNotifications,
        errorMessage: pageError,
        familyName,
        grades,
        notifications,
        todayEvents,
        unreadCount,
        upcomingEvents
      }}
    />
  );
}
