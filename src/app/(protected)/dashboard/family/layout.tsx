import { requireRole } from "@/lib/auth/session";

export default async function FamilyLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("family");
  return children;
}
