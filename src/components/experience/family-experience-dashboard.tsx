"use client";

import * as React from "react";
import { FamilyDashboardView } from "@/components/dashboards/family/family-dashboard-view";
import { ExperienceDemoPanel } from "@/components/experience/experience-demo-panel";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { createFamilyDashboardDemoActions, familyDashboardExperienceRoutes } from "@/lib/demo-actions/family/family-dashboard-demo-actions";
import { createFamilyDashboardDemoData } from "@/lib/demo-data/family/family-dashboard-demo-adapter";
import { resetExperienceStorage } from "@/lib/experience/demo-storage";

type FamilyExperienceDashboardProps = {
  demoPanel?: string;
  startGuide?: boolean;
};

export function FamilyExperienceDashboard({ demoPanel, startGuide = false }: FamilyExperienceDashboardProps) {
  const [data, setData] = React.useState(() => createFamilyDashboardDemoData());
  const actions = React.useMemo(() => createFamilyDashboardDemoActions(), []);

  function resetExperience() {
    actions.reset();
    resetExperienceStorage("familia");
    setData(createFamilyDashboardDemoData());
  }

  return (
    <ExperienceShell brand={educacoraExperienceBrand} role="familia" onReset={resetExperience} startGuide={startGuide}>
      <FamilyDashboardView
        brand={educacoraExperienceBrand}
        data={data}
        mode="experience"
        routes={familyDashboardExperienceRoutes}
      />
      <ExperienceDemoPanel role="familia" panel={demoPanel} />
    </ExperienceShell>
  );
}
