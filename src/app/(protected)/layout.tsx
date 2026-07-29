import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { requireSchoolContext } from "@/lib/schools/context";

export default async function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.active) {
    redirect("/login");
  }

  if (profile.must_change_password) {
    redirect("/change-password");
  }

  const schoolContext = await requireSchoolContext(undefined, profile);
  const { academicYear } = schoolContext.schoolId
    ? await getActiveAcademicYear(schoolContext.schoolId)
    : { academicYear: null };
  const contextualProfile = {
    ...profile,
    role: schoolContext.role
  };

  return (
    <AppShell
      profile={contextualProfile}
      schoolContext={schoolContext}
      academicYearName={academicYear?.name ?? null}
    >
      {children}
    </AppShell>
  );
}
