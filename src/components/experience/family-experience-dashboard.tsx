"use client";

import * as React from "react";
import { FamilyDashboardView } from "@/components/dashboards/family/family-dashboard-view";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { createFamilyDashboardDemoActions, familyDashboardExperienceRoutes } from "@/lib/demo-actions/family/family-dashboard-demo-actions";
import { createFamilyDashboardDemoData } from "@/lib/demo-data/family/family-dashboard-demo-adapter";

export function FamilyExperienceDashboard() {
  const [data, setData] = React.useState(() => createFamilyDashboardDemoData());
  const actions = React.useMemo(() => createFamilyDashboardDemoActions(), []);

  function resetExperience() {
    actions.reset();
    setData(createFamilyDashboardDemoData());
  }

  return (
    <ExperienceShell brand={educacoraExperienceBrand} role="familia" onReset={resetExperience}>
      <FamilyDashboardView
        brand={educacoraExperienceBrand}
        data={data}
        mode="experience"
        routes={familyDashboardExperienceRoutes}
      />
    </ExperienceShell>
  );
}
