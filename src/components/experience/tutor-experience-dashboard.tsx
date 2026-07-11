"use client";

import * as React from "react";
import { TutorDashboardView, type TutorDashboardTab } from "@/components/dashboards/tutor/tutor-dashboard-view";
import { ExperienceDemoPanel } from "@/components/experience/experience-demo-panel";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { createTutorDashboardDemoActions, tutorDashboardExperienceRoutes } from "@/lib/demo-actions/tutor/tutor-dashboard-demo-actions";
import { createTutorDashboardDemoData } from "@/lib/demo-data/tutor/tutor-dashboard-demo-adapter";
import { resetExperienceStorage } from "@/lib/experience/demo-storage";

type TutorExperienceDashboardProps = {
  activeTab: TutorDashboardTab;
  demoPanel?: string;
  startGuide?: boolean;
};

export function TutorExperienceDashboard({ activeTab, demoPanel, startGuide = false }: TutorExperienceDashboardProps) {
  const [data, setData] = React.useState(() => createTutorDashboardDemoData(activeTab));
  const actions = React.useMemo(() => createTutorDashboardDemoActions(), []);

  React.useEffect(() => {
    setData(createTutorDashboardDemoData(activeTab));
  }, [activeTab]);

  function resetExperience() {
    actions.reset();
    resetExperienceStorage("docente");
    setData(createTutorDashboardDemoData(activeTab));
  }

  return (
    <ExperienceShell brand={educacoraExperienceBrand} role="docente" onReset={resetExperience} startGuide={startGuide}>
      <TutorDashboardView
        activeTab={activeTab}
        brand={educacoraExperienceBrand}
        data={data}
        mode="experience"
        routes={tutorDashboardExperienceRoutes}
      />
      <ExperienceDemoPanel role="docente" panel={demoPanel ?? activeTab} />
    </ExperienceShell>
  );
}
