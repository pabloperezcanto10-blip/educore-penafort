import type { TutorDashboardRoutes } from "@/components/dashboards/tutor/tutor-dashboard-view";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const tutorDashboardExperienceRoutes: TutorDashboardRoutes = {
  root: "/experience/docente",
  attendance: "/experience/docente?work_tab=pendientes",
  attendanceSlot: () => "/experience/docente?work_tab=pendientes",
  calendar: "/experience/docente?work_tab=calendario",
  communications: "/experience/docente?work_tab=comunicaciones",
  gradebook: "/experience/docente?work_tab=cuaderno",
  schedule: "/experience/docente",
  students: "/experience/docente?work_tab=alumnos"
};

export function createTutorDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience docente restablecida.")
  };
}
