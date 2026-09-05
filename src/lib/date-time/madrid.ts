export const MADRID_TIME_ZONE = "Europe/Madrid";

const weekdayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
] as const;

const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
] as const;

type MadridDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type MadridWeekDay = {
  date: string;
  weekday: number;
  label: string;
  isToday: boolean;
};

export type MadridWeek = {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  nextStartDate: string;
  label: string;
  days: MadridWeekDay[];
};

export function getMadridDate(instant: Date | string = new Date()) {
  const parts = getMadridDateParts(instant);
  return toIsoDate(parts.year, parts.month, parts.day);
}

export function formatMadridDateTime(instant: Date | string) {
  const parts = getMadridDateParts(instant);
  const weekday = getIsoWeekday(toIsoDate(parts.year, parts.month, parts.day));

  return `${weekdayNames[weekday]}, ${parts.day} de ${monthNames[parts.month - 1]} de ${parts.year} · ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function isIsoDate(value: string) {
  return parseIsoDate(value) !== null;
}

export function getIsoWeekday(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return 0;

  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
}

export function addIsoDays(value: string, days: number) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    throw new Error("Invalid ISO date.");
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function getMadridWeek(referenceDate = getMadridDate()): MadridWeek {
  const safeReference = isIsoDate(referenceDate) ? referenceDate : getMadridDate();
  const weekday = getIsoWeekday(safeReference);
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const startDate = addIsoDays(safeReference, mondayOffset);
  const endDate = addIsoDays(startDate, 4);
  const today = getMadridDate();
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = addIsoDays(startDate, index);
    const parts = parseIsoDate(date)!;

    return {
      date,
      weekday: index + 1,
      label: `${weekdayNames[index + 1]} ${parts.day}`,
      isToday: date === today
    };
  });

  return {
    startDate,
    endDate,
    previousStartDate: addIsoDays(startDate, -7),
    nextStartDate: addIsoDays(startDate, 7),
    label: formatWeekRange(startDate, endDate),
    days
  };
}

function formatWeekRange(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate)!;
  const end = parseIsoDate(endDate)!;

  if (start.year === end.year && start.month === end.month) {
    return `Semana del ${start.day} al ${end.day} de ${monthNames[end.month - 1]} de ${end.year}`;
  }

  if (start.year === end.year) {
    return `Semana del ${start.day} de ${monthNames[start.month - 1]} al ${end.day} de ${monthNames[end.month - 1]} de ${end.year}`;
  }

  return `Semana del ${start.day} de ${monthNames[start.month - 1]} de ${start.year} al ${end.day} de ${monthNames[end.month - 1]} de ${end.year}`;
}

function getMadridDateParts(instant: Date | string): MadridDateParts {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
