import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function TutorCalendarPage() {
  const profile = await requireRole("tutor");

  return (
    <GoogleCalendarEmbed
      backHref="/dashboard/tutor"
      calendarId={profile.schoolContext.branding.calendarId}
      centerName={profile.schoolContext.branding.name}
    />
  );
}
