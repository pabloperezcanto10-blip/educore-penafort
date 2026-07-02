import Link from "next/link";
import { BookOpenCheck, CalendarDays, FileCheck2, GraduationCap, MessageSquareText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { CalendarSummaryCard } from "@/components/dashboard/calendar-summary-card";
import { getDashboardNotifications } from "@/lib/internal-notifications";

const modules = [
  {
    href: "/dashboard/director/students",
    title: "Alumnos",
    description: "Busca alumnos, filtra por curso y accede a fichas completas de seguimiento.",
    icon: GraduationCap
  },
  {
    href: "/dashboard/director/communications",
    title: "Comunicaciones",
    description: "Supervisa comunicaciones del centro y responde las dirigidas a direccion.",
    icon: MessageSquareText
  },
  {
    href: "/dashboard/director/gradebook",
    title: "Cuaderno de calificaciones",
    description: "Revisa parciales, criterios, cierres trimestrales y publicacion de evaluaciones.",
    icon: BookOpenCheck
  },
  {
    href: "/dashboard/director/final-grades",
    title: "Cierre final de curso",
    description: "Supervisa notas finales anuales y publica el boletin final.",
    icon: FileCheck2
  },
  {
    href: "/dashboard/director/calendar",
    title: "Calendario / Fechas de interes",
    description: "Consulta examenes, reuniones, salidas, evaluaciones y avisos importantes del centro.",
    icon: CalendarDays
  }
];

export default async function DirectorDashboardPage() {
  const profile = await requireRole("director");
  const { notifications, unreadCount, errorMessage } = await getDashboardNotifications({
    userId: profile.id,
    role: "director",
    communicationHref: "/dashboard/director/communications"
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Buenos d&iacute;as</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisi&oacute;n global del centro, comunicaciones y cierre acad&eacute;mico.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte de novedades: {errorMessage}
        </div>
      ) : null}

      <NotificationsPanel notifications={notifications} unreadCount={unreadCount} />
      <CalendarSummaryCard href="/dashboard/director/calendar" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-lg border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md"
            >
              <div className="flex h-full flex-col gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{module.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
