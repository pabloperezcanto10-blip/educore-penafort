import type { DirectorDashboardRoutes } from "@/components/dashboards/director/director-dashboard-view";
import { getExperienceModuleHref } from "@/components/experience/experience-data";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const directorDashboardExperienceRoutes: DirectorDashboardRoutes = {
  root: "/experience/director",
  calendar: getExperienceModuleHref("director", "calendar"),
  communications: getExperienceModuleHref("director", "communications"),
  communicationsDirectorOnly: getExperienceModuleHref("director", "communications"),
  gradebook: getExperienceModuleHref("director", "gradebook"),
  students: getExperienceModuleHref("director", "students")
};

export function createDirectorDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience de Dirección restablecida.")
  };
}
