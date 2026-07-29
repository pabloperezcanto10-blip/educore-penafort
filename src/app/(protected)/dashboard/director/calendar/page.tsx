import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function DirectorCalendarPage() {
  const profile = await requireRole("director");

  return (
    <GoogleCalendarEmbed
      backHref="/dashboard/director"
      calendarId={profile.schoolContext.branding.calendarId}
      centerName={profile.schoolContext.branding.name}
    />
  );
}
