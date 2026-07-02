import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function TutorCalendarPage() {
  await requireRole("tutor");

  return <GoogleCalendarEmbed backHref="/dashboard/tutor" />;
}
