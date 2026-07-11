"use client";

import * as React from "react";
import { DirectorDashboardView, type DirectorDashboardTab } from "@/components/dashboards/director/director-dashboard-view";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { createDirectorDashboardDemoActions } from "@/lib/demo-actions/director/director-dashboard-demo-actions";
import { createDirectorDashboardDemoData } from "@/lib/demo-data/director/director-dashboard-demo-adapter";

type DirectorExperienceDashboardProps = {
  activeTab: DirectorDashboardTab;
};

export function DirectorExperienceDashboard({ activeTab }: DirectorExperienceDashboardProps) {
  const [data, setData] = React.useState(() => createDirectorDashboardDemoData(activeTab));
  const actions = React.useMemo(() => createDirectorDashboardDemoActions(), []);

  React.useEffect(() => {
    setData(createDirectorDashboardDemoData(activeTab));
  }, [activeTab]);

  function resetExperience() {
    actions.reset();
    setData(createDirectorDashboardDemoData(activeTab));
  }

  return (
    <ExperienceShell brand={educacoraExperienceBrand} role="director" onReset={resetExperience}>
      <DirectorDashboardView {...data} />
    </ExperienceShell>
  );
}
