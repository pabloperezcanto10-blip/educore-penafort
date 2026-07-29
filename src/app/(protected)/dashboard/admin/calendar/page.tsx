import { GoogleCalendarEmbed } from "@/components/calendar/google-calendar-embed";
import { requireRole } from "@/lib/auth/session";

export default async function AdminCalendarPage() {
  const profile = await requireRole("superadmin");

  return (
    <GoogleCalendarEmbed
      backHref="/dashboard/admin"
      calendarId={profile.schoolContext.branding.calendarId}
      centerName={profile.schoolContext.branding.name}
    />
  );
}
