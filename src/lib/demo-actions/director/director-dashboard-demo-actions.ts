import type { DirectorDashboardRoutes } from "@/components/dashboards/director/director-dashboard-view";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const directorDashboardExperienceRoutes: DirectorDashboardRoutes = {
  root: "/experience/director",
  calendar: "/experience/director?work_tab=calendario",
  communications: "/experience/director?work_tab=comunicaciones",
  communicationsDirectorOnly: "/experience/director?work_tab=comunicaciones",
  gradebook: "/experience/director?work_tab=evaluacion",
  students: "/experience/director?work_tab=alumnos"
};

export function createDirectorDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience de Dirección restablecida.")
  };
}
