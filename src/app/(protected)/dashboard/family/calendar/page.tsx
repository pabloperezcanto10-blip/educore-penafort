import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function FamilyCalendarPage() {
  const profile = await requireRole("family");

  return (
    <GoogleCalendarEmbed
      backHref="/dashboard/family"
      calendarId={profile.schoolContext.branding.calendarId}
      centerName={profile.schoolContext.branding.name}
    />
  );
}
