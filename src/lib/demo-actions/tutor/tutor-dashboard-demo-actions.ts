import type { TutorDashboardRoutes } from "@/components/dashboards/tutor/tutor-dashboard-view";
import { getExperienceModuleHref } from "@/components/experience/experience-data";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const tutorDashboardExperienceRoutes: TutorDashboardRoutes = {
  root: "/experience/docente",
  attendance: getExperienceModuleHref("docente", "attendance"),
  attendanceSlot: () => getExperienceModuleHref("docente", "attendance"),
  calendar: getExperienceModuleHref("docente", "calendar"),
  communications: getExperienceModuleHref("docente", "communications"),
  gradebook: getExperienceModuleHref("docente", "gradebook"),
  schedule: getExperienceModuleHref("docente", "attendance"),
  students: getExperienceModuleHref("docente", "students")
};

export function createTutorDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience docente restablecida.")
  };
}
