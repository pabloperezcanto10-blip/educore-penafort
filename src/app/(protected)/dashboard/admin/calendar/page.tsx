import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function AdminCalendarPage() {
  await requireRole("superadmin");

  return <GoogleCalendarEmbed backHref="/dashboard/admin" />;
}
