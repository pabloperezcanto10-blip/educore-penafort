import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directorDashboardTabs, type DirectorDashboardTab } from "@/components/dashboards/director/director-dashboard-view";
import { tutorDashboardTabs, type TutorDashboardTab } from "@/components/dashboards/tutor/tutor-dashboard-view";
import { DirectorExperienceDashboard } from "@/components/experience/director-experience-dashboard";
import { FamilyExperienceDashboard } from "@/components/experience/family-experience-dashboard";
import { TutorExperienceDashboard } from "@/components/experience/tutor-experience-dashboard";
import { type ExperienceRole } from "@/components/experience/experience-data";

const allowedRoles: ExperienceRole[] = ["director", "docente", "familia"];

type ExperienceRolePageProps = {
  params: {
    role: string;
  };
  searchParams?: {
    work_tab?: string;
  };
};

export function generateMetadata({ params }: ExperienceRolePageProps): Metadata {
  const role = parseRole(params.role);

  return {
    title: role ? `EducaCora Experience | ${roleLabel(role)}` : "EducaCora Experience",
    description: "Entorno demostrativo de EducaCora con datos ficticios y acciones simuladas.",
    robots: role
      ? {
          index: false,
          follow: true
        }
      : undefined
  };
}

export function generateStaticParams() {
  return allowedRoles.map((role) => ({ role }));
}

export default function ExperienceRolePage({ params, searchParams }: ExperienceRolePageProps) {
  const role = parseRole(params.role);

  if (!role) {
    notFound();
  }

  if (role === "director") {
    return <DirectorExperienceDashboard activeTab={normalizeDirectorTab(searchParams?.work_tab)} />;
  }

  if (role === "docente") {
    return <TutorExperienceDashboard activeTab={normalizeTutorTab(searchParams?.work_tab)} />;
  }

  return <FamilyExperienceDashboard />;
}

function parseRole(value: string): ExperienceRole | null {
  return allowedRoles.includes(value as ExperienceRole) ? (value as ExperienceRole) : null;
}

function roleLabel(role: ExperienceRole) {
  if (role === "director") return "Dirección";
  if (role === "docente") return "Docente";
  return "Familia";
}

function normalizeDirectorTab(value: string | undefined): DirectorDashboardTab {
  return directorDashboardTabs.some((tab) => tab.id === value) ? (value as DirectorDashboardTab) : "prioridades";
}

function normalizeTutorTab(value: string | undefined): TutorDashboardTab {
  return tutorDashboardTabs.some((tab) => tab.id === value) ? (value as TutorDashboardTab) : "pendientes";
}
