import type { DirectorDashboardRoutes } from "@/components/dashboards/director/director-dashboard-view";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const directorDashboardExperienceRoutes: DirectorDashboardRoutes = {
  root: "/experience/director",
  calendar: "/experience/director?work_tab=calendario&demo=calendar",
  communications: "/experience/director?work_tab=comunicaciones&demo=communications",
  communicationsDirectorOnly: "/experience/director?work_tab=comunicaciones&demo=communications",
  gradebook: "/experience/director?work_tab=evaluacion&demo=gradebook",
  students: "/experience/director?work_tab=alumnos&demo=students"
};

export function createDirectorDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience de Dirección restablecida.")
  };
}
