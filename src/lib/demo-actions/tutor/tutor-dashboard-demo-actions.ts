import type { TutorDashboardRoutes } from "@/components/dashboards/tutor/tutor-dashboard-view";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const tutorDashboardExperienceRoutes: TutorDashboardRoutes = {
  root: "/experience/docente",
  attendance: "/experience/docente?work_tab=pendientes&demo=attendance",
  attendanceSlot: () => "/experience/docente?work_tab=pendientes&demo=attendance",
  calendar: "/experience/docente?work_tab=calendario&demo=calendar",
  communications: "/experience/docente?work_tab=comunicaciones&demo=communications",
  gradebook: "/experience/docente?work_tab=cuaderno&demo=gradebook",
  schedule: "/experience/docente?demo=attendance",
  students: "/experience/docente?work_tab=alumnos&demo=students"
};

export function createTutorDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience docente restablecida.")
  };
}
