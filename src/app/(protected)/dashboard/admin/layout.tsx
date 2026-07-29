import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("superadmin");
  return children;
}
