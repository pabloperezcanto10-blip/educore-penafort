import { SchoolLogo } from "@/components/branding/school-logo";
import { schoolSettings } from "@/lib/settings";

export function DashboardBrandMark() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 shadow-sm">
      <SchoolLogo size="sm" />
      <span className="text-sm font-semibold text-foreground">{schoolSettings.name}</span>
    </div>
  );
}
