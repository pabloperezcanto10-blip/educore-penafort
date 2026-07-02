import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function DirectorCalendarPage() {
  await requireRole("director");

  return <GoogleCalendarEmbed backHref="/dashboard/director" />;
}
