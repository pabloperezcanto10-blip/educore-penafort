import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getActiveAcademicYear } from "@/lib/academic-years";

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

  const { academicYear } = await getActiveAcademicYear();

  return (
    <AppShell profile={profile} academicYearName={academicYear?.name ?? null}>
      {children}
    </AppShell>
  );
}
