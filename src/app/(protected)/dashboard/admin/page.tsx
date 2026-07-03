import Link from "next/link";
import { BookOpenCheck, CalendarCheck, FileCheck2, FilePlus2, Inbox, ShieldCheck, Upload, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { getDashboardNotifications } from "@/lib/internal-notifications";

const adminSections = [
  {
    title: "Mantenimiento",
    description: "Gestiona cursos, materias, alumnos, familias y profesores.",
    href: "/dashboard/admin/maintenance",
    icon: Wrench
  },
  {
    title: "Curso escolar",
    description: "Gestiona el curso activo, historico anual y preparacion de promocion.",
    href: "/dashboard/admin/academic-years",
    icon: CalendarCheck
  },
  {
    title: "Pagina de creacion",
    description: "Crea perfiles, relaciones y estructuras del centro.",
    href: "/dashboard/admin/create",
    icon: FilePlus2
  },
  {
    title: "Importación masiva",
    description: "Importa alumnos y familias por clase automáticamente.",
    href: "/dashboard/admin/import",
    icon: Upload
  },
  {
    title: "Cuaderno de notas",
    description: "Supervisa, revisa y publica evaluaciones.",
    href: "/dashboard/admin/gradebook",
    icon: BookOpenCheck
  },
  {
    title: "Cierre final de curso",
    description: "Supervisa notas anuales y publica boletines finales.",
    href: "/dashboard/admin/final-grades",
    icon: FileCheck2
  },
  {
    title: "Comunicaciones",
    description: "Accede a todas las comunicaciones del centro.",
    href: "/dashboard/admin/communications",
    icon: Inbox
  },
  {
    title: "Calendario / Fechas de interes",
    description: "Consulta examenes, reuniones, salidas, evaluaciones y avisos importantes del centro.",
    href: "/dashboard/admin/calendar",
    icon: CalendarCheck
  },
  {
    title: "Seguridad y auditoria",
    description: "Consulta cambios sensibles, accesos y acciones registradas.",
    href: "/dashboard/admin/security",
    icon: ShieldCheck
  }
];

export default async function AdminDashboardPage() {
  const profile = await requireRole("superadmin");
  const { notifications, unreadCount, errorMessage } = await getDashboardNotifications({
    userId: profile.id,
    role: "superadmin",
    communicationHref: "/dashboard/admin/communications"
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Panel de administraci&oacute;n</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mantenimiento t&eacute;cnico, seguridad y configuraci&oacute;n estructural de la plataforma.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte de novedades: {errorMessage}
        </div>
      ) : null}

      <NotificationsPanel notifications={notifications} unreadCount={unreadCount} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {adminSections.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.title}
              href={section.href}
              className="rounded-lg border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
