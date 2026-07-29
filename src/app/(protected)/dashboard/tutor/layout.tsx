import { requireRole } from "@/lib/auth/session";

export default async function TutorLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("tutor");
  return children;
}
