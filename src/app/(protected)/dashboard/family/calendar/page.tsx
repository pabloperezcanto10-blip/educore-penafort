import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function FamilyCalendarPage() {
  await requireRole("family");

  return <GoogleCalendarEmbed backHref="/dashboard/family" />;
}
