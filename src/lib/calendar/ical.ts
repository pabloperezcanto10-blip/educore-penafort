const calendarIcsUrl =
  "https://calendar.google.com/calendar/ical/fo7mnf4nmdge5cib93bfq77414%40group.calendar.google.com/public/basic.ics";

export type CalendarEventSummary = {
  id: string;
  title: string;
  startsAt: Date;
  allDay: boolean;
};

type RawIcsEvent = {
  uid: string;
  summary: string;
  startsAt: Date | null;
  allDay: boolean;
  rrule: string | null;
};

export async function getDashboardCalendarEvents(): Promise<{
  todayEvents: CalendarEventSummary[];
  upcomingEvents: CalendarEventSummary[];
  errorMessage: string | null;
}> {
  try {
    const response = await fetch(calendarIcsUrl, {
      next: { revalidate: 900 }
    });

    if (!response.ok) {
      return emptyCalendarResult("No se pudieron cargar los proximos eventos. Consulta el calendario.");
    }

    const ics = await response.text();
    const events = expandRecurringEvents(parseIcsEvents(ics));
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const dayAfterTomorrowStart = addDays(todayStart, 2);
    const nextWeekEnd = addDays(todayStart, 8);

    const futureEvents = events
      .filter((event) => event.startsAt >= todayStart && event.startsAt < nextWeekEnd)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const todayEvents = futureEvents.filter((event) => event.startsAt >= todayStart && event.startsAt < tomorrowStart);
    const tomorrowEvents = futureEvents.filter((event) => event.startsAt >= tomorrowStart && event.startsAt < dayAfterTomorrowStart);
    const laterEvents = futureEvents.filter((event) => event.startsAt >= dayAfterTomorrowStart);
    const upcomingEvents = todayEvents.length > 0 || tomorrowEvents.length > 0
      ? [...tomorrowEvents, ...laterEvents].slice(0, 4)
      : laterEvents.slice(0, 4);

    return {
      todayEvents: todayEvents.slice(0, 4),
      upcomingEvents,
      errorMessage: null
    };
  } catch {
    return emptyCalendarResult("No se pudieron cargar los proximos eventos. Consulta el calendario.");
  }
}

function parseIcsEvents(ics: string): RawIcsEvent[] {
  const lines = unfoldIcsLines(ics);
  const events: RawIcsEvent[] = [];
  let current: Record<string, string> | null = null;

  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      current = {};
      return;
    }

    if (line === "END:VEVENT") {
      if (current) {
        const startEntry = findEntry(current, "DTSTART");
        const parsedStart = startEntry ? parseIcsDate(startEntry.value, startEntry.params) : null;

        events.push({
          uid: current.UID ?? `${current.SUMMARY ?? "event"}-${startEntry?.value ?? events.length}`,
          summary: decodeIcsText(current.SUMMARY ?? "Evento del centro"),
          startsAt: parsedStart?.date ?? null,
          allDay: parsedStart?.allDay ?? false,
          rrule: current.RRULE ?? null
        });
      }

      current = null;
      return;
    }

    if (!current) return;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return;

    const rawKey = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    const key = rawKey.split(";")[0];
    current[key] = value;
    current[rawKey] = value;
  });

  return events.filter((event) => event.startsAt);
}

function unfoldIcsLines(ics: string) {
  return ics
    .replace(/\r\n/g, "\n")
    .split("\n")
    .reduce<string[]>((acc, line) => {
      if ((line.startsWith(" ") || line.startsWith("\t")) && acc.length > 0) {
        acc[acc.length - 1] += line.slice(1);
      } else if (line.trim()) {
        acc.push(line.trimEnd());
      }

      return acc;
    }, []);
}

function findEntry(event: Record<string, string>, property: string) {
  const key = Object.keys(event).find((candidate) => candidate === property || candidate.startsWith(`${property};`));

  if (!key) return null;

  return {
    value: event[key],
    params: key
  };
}

function parseIcsDate(value: string, params: string) {
  const allDay = params.includes("VALUE=DATE") || /^\d{8}$/.test(value);

  if (allDay) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));

    return { date: new Date(year, month, day), allDay: true };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);

  if (!match) return null;

  const [, year, month, day, hour, minute, second, utc] = match;
  const date = utc
    ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  return { date, allDay: false };
}

function expandRecurringEvents(events: RawIcsEvent[]): CalendarEventSummary[] {
  const now = new Date();
  const windowStart = startOfDay(now);
  const windowEnd = addDays(windowStart, 8);

  return events.flatMap((event) => {
    if (!event.startsAt) return [];

    if (!event.rrule) {
      return [toSummaryEvent(event, event.startsAt)];
    }

    return expandSimpleRRule(event, windowStart, windowEnd);
  });
}

function expandSimpleRRule(event: RawIcsEvent, windowStart: Date, windowEnd: Date) {
  if (!event.startsAt || !event.rrule) return [];

  const parts = parseRRule(event.rrule);
  const frequency = parts.FREQ;

  if (!frequency || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(frequency)) {
    return [toSummaryEvent(event, event.startsAt)];
  }

  const interval = Number(parts.INTERVAL ?? "1");
  const until = parts.UNTIL ? parseIcsDate(parts.UNTIL, "UNTIL")?.date : null;
  const count = parts.COUNT ? Number(parts.COUNT) : 500;
  const occurrences: CalendarEventSummary[] = [];
  let occurrence = new Date(event.startsAt);
  let index = 0;

  while (occurrence < windowEnd && index < count && index < 500) {
    if ((!until || occurrence <= until) && occurrence >= windowStart) {
      occurrences.push(toSummaryEvent(event, occurrence));
    }

    occurrence = addFrequency(occurrence, frequency, Number.isFinite(interval) && interval > 0 ? interval : 1);
    index += 1;
  }

  return occurrences;
}

function parseRRule(value: string) {
  return value.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ruleValue] = part.split("=");

    if (key && ruleValue) {
      acc[key] = ruleValue;
    }

    return acc;
  }, {});
}

function addFrequency(date: Date, frequency: string, interval: number) {
  const next = new Date(date);

  if (frequency === "DAILY") next.setDate(next.getDate() + interval);
  if (frequency === "WEEKLY") next.setDate(next.getDate() + interval * 7);
  if (frequency === "MONTHLY") next.setMonth(next.getMonth() + interval);
  if (frequency === "YEARLY") next.setFullYear(next.getFullYear() + interval);

  return next;
}

function toSummaryEvent(event: RawIcsEvent, startsAt: Date): CalendarEventSummary {
  return {
    id: `${event.uid}-${startsAt.toISOString()}`,
    title: event.summary,
    startsAt,
    allDay: event.allDay
  };
}

function decodeIcsText(value: string) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function emptyCalendarResult(errorMessage: string) {
  return {
    todayEvents: [],
    upcomingEvents: [],
    errorMessage
  };
}
