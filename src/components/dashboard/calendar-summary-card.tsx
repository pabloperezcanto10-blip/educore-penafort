import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getDashboardCalendarEvents, type CalendarEventSummary } from "@/lib/calendar/ical";

export async function CalendarSummaryCard({ href }: { href: string }) {
  const { todayEvents, upcomingEvents, errorMessage } = await getDashboardCalendarEvents();
  const hasEvents = todayEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Hoy y proximos eventos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage
                ? "No se pudieron cargar los proximos eventos. Consulta el calendario."
                : hasEvents
                  ? "Agenda oficial del centro para hoy y los proximos dias."
                  : "No hay eventos programados para hoy ni los proximos dias."}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
        >
          Ver calendario
        </Link>
      </div>

      {!errorMessage && hasEvents ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {todayEvents.length > 0 ? <EventGroup title="Eventos de hoy" events={todayEvents} /> : null}
          {upcomingEvents.length > 0 ? <EventGroup title="Proximos eventos" events={upcomingEvents} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function EventGroup({ title, events }: { title: string; events: CalendarEventSummary[] }) {
  return (
    <div className="rounded-md border border-border bg-[#f8fafc] p-3">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="mt-2 space-y-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-md border border-border bg-white px-3 py-2 shadow-sm">
            <p className="text-sm font-semibold text-foreground">{event.title}</p>
            <span className="mt-2 inline-flex rounded-full border border-border bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {formatCalendarEventDate(event)}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatCalendarEventDate(event: CalendarEventSummary) {
  const date = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(event.startsAt);

  if (event.allDay) {
    return `${date} - Todo el dia`;
  }

  const time = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(event.startsAt);

  return `${date} - ${time}`;
}
