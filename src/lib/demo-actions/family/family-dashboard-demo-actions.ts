import type { FamilyDashboardRoutes } from "@/components/dashboards/family/family-dashboard-view";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const familyDashboardExperienceRoutes: FamilyDashboardRoutes = {
  root: "/experience/familia",
  calendar: "/experience/familia",
  communications: "/experience/familia",
  grades: "/experience/familia",
  student: "/experience/familia"
};

export function createFamilyDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience familiar restablecida.")
  };
}
