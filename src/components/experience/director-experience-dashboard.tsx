"use client";

import * as React from "react";
import { DirectorDashboardView, type DirectorDashboardTab } from "@/components/dashboards/director/director-dashboard-view";
import { ExperienceDemoPanel } from "@/components/experience/experience-demo-panel";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { createDirectorDashboardDemoActions } from "@/lib/demo-actions/director/director-dashboard-demo-actions";
import { createDirectorDashboardDemoData } from "@/lib/demo-data/director/director-dashboard-demo-adapter";
import { resetExperienceStorage } from "@/lib/experience/demo-storage";

type DirectorExperienceDashboardProps = {
  activeTab: DirectorDashboardTab;
  demoPanel?: string;
  startGuide?: boolean;
};

export function DirectorExperienceDashboard({ activeTab, demoPanel, startGuide = false }: DirectorExperienceDashboardProps) {
  const [data, setData] = React.useState(() => createDirectorDashboardDemoData(activeTab));
  const actions = React.useMemo(() => createDirectorDashboardDemoActions(), []);

  React.useEffect(() => {
    setData(createDirectorDashboardDemoData(activeTab));
  }, [activeTab]);

  function resetExperience() {
    actions.reset();
    resetExperienceStorage("director");
    setData(createDirectorDashboardDemoData(activeTab));
  }

  return (
    <ExperienceShell brand={educacoraExperienceBrand} role="director" onReset={resetExperience} startGuide={startGuide}>
      <DirectorDashboardView {...data} />
      <ExperienceDemoPanel role="director" panel={demoPanel ?? activeTab} />
    </ExperienceShell>
  );
}
