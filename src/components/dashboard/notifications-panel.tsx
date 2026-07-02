import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import type { DashboardNotification } from "@/lib/internal-notifications";
import { markAllInternalNotificationsRead, markInternalNotificationRead } from "@/app/(protected)/dashboard/notifications/actions";

export function NotificationsPanel({
  notifications,
  unreadCount
}: {
  notifications: DashboardNotification[];
  unreadCount: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Novedades</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.`
                : "No hay avisos pendientes."}
            </p>
          </div>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllInternalNotificationsRead}>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted">
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Marcar todo como leido
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-[#f8fafc] p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Todo al dia</p>
          <p className="mt-1">No hay avisos pendientes.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {notifications.map((notification) => (
            <article
              key={`${notification.source}-${notification.id}`}
              className={`rounded-md border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                notification.read ? "border-border bg-[#f8fafc]" : "border-primary/25 bg-primary/5"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <Link href={notification.href} className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{notification.title}</h3>
                    <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {notification.source === "communication" ? "Comunicacion" : "Sistema"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.body}</p>
                </Link>
                {!notification.read && notification.source === "internal" ? (
                  <form action={markInternalNotificationRead}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button className="h-8 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted">
                      Leida
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
