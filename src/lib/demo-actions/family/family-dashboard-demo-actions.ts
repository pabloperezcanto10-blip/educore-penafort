import type { FamilyDashboardRoutes } from "@/components/dashboards/family/family-dashboard-view";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const familyDashboardExperienceRoutes: FamilyDashboardRoutes = {
  root: "/experience/familia",
  calendar: "/experience/familia?demo=calendar",
  communications: "/experience/familia?demo=communications",
  grades: "/experience/familia?demo=grades",
  student: "/experience/familia?demo=student"
};

export function createFamilyDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience familiar restablecida.")
  };
}
