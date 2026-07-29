import { requireRole } from "@/lib/auth/session";

export default async function DirectorLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("director");
  return children;
}
