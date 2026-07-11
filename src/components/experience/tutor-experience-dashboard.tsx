"use client";

import * as React from "react";
import { TutorDashboardView, type TutorDashboardTab } from "@/components/dashboards/tutor/tutor-dashboard-view";
import { ExperienceShell } from "@/components/experience/experience-shell";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { createTutorDashboardDemoActions, tutorDashboardExperienceRoutes } from "@/lib/demo-actions/tutor/tutor-dashboard-demo-actions";
import { createTutorDashboardDemoData } from "@/lib/demo-data/tutor/tutor-dashboard-demo-adapter";

type TutorExperienceDashboardProps = {
  activeTab: TutorDashboardTab;
};

export function TutorExperienceDashboard({ activeTab }: TutorExperienceDashboardProps) {
  const [data, setData] = React.useState(() => createTutorDashboardDemoData(activeTab));
  const actions = React.useMemo(() => createTutorDashboardDemoActions(), []);

  React.useEffect(() => {
    setData(createTutorDashboardDemoData(activeTab));
  }, [activeTab]);

  function resetExperience() {
    actions.reset();
    setData(createTutorDashboardDemoData(activeTab));
  }

  return (
    <ExperienceShell brand={educacoraExperienceBrand} role="docente" onReset={resetExperience}>
      <TutorDashboardView
        activeTab={activeTab}
        brand={educacoraExperienceBrand}
        data={data}
        mode="experience"
        routes={tutorDashboardExperienceRoutes}
      />
    </ExperienceShell>
  );
}
