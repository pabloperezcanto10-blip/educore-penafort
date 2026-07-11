"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, BookOpenCheck, CalendarDays, CheckCircle2, FileText, MessageCircleReply, MessageSquareText, ShieldCheck } from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";

export type CenterActivityCategory = "all" | "communications" | "academic" | "incidents" | "calendar" | "attention";
export type CenterActivityKind = "communication" | "reply" | "incident" | "attendance" | "grade" | "report" | "calendar" | "system";
export type CenterActivityPriority = "info" | "followup" | "attention";
export type CenterActivityTone = "blue" | "green" | "amber" | "gray" | "red";

export type CenterActivityItem = {
  id: string;
  title: string;
  meta: string;
  date: string;
  href: string;
  actionLabel: string;
  tone: CenterActivityTone;
  kind: CenterActivityKind;
  category: Exclude<CenterActivityCategory, "all" | "attention">;
  priority: CenterActivityPriority;
  groupKey?: string;
};

export type CenterActivityGroupRoutes = Partial<Record<"communications" | "academic" | "incidents" | "calendar", string>>;

const filters: Array<{ id: CenterActivityCategory; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "communications", label: "Comunicaciones" },
  { id: "academic", label: "Académico" },
  { id: "incidents", label: "Incidencias" },
  { id: "calendar", label: "Calendario" },
  { id: "attention", label: "Requiere atención" }
];

export function CenterActivityTimeline({ items, groupRoutes }: { items: CenterActivityItem[]; groupRoutes?: CenterActivityGroupRoutes }) {
  const [activeFilter, setActiveFilter] = useState<CenterActivityCategory>("all");
  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "attention") return item.priority === "attention";
      return item.category === activeFilter;
    });

    return groupActivityItems(filtered, groupRoutes);
  }, [activeFilter, groupRoutes, items]);

  return (
    <GradebookCard>
      <GradebookCardHeader title="Actividad del centro">
        <GradebookBadge tone="blue">Actividad del colegio</GradebookBadge>
      </GradebookCardHeader>

      <div className="border-b border-slate-200 p-2">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Filtros de actividad del centro">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition ${
                activeFilter === filter.id
                  ? "bg-sky-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4">
        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No hay actividad reciente para este filtro.
          </div>
        ) : (
          <ol className="relative space-y-3 border-l border-slate-200 pl-6">
            {visibleItems.map((item) => (
              <ActivityTimelineRow key={item.id} item={item} />
            ))}
          </ol>
        )}
      </div>
    </GradebookCard>
  );
}

function ActivityTimelineRow({ item }: { item: CenterActivityItem }) {
  const Icon = iconByKind[item.kind];

  return (
    <li className="relative">
      <span className={`absolute -left-[34px] top-4 flex h-6 w-6 items-center justify-center rounded-full ring-1 ${toneClass[item.tone]}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <Link href={item.href} className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-200 hover:bg-slate-50">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${softToneClass[item.tone]}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>{kindLabel[item.kind]}</span>
              <PriorityBadge priority={item.priority} />
            </div>
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="text-xs leading-5 text-slate-500">{item.meta}</p>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 md:flex-col md:items-end">
            <time className="text-xs text-slate-400">{formatRelativeDate(item.date)}</time>
            <span className="text-xs font-semibold text-sky-700">{item.actionLabel} →</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function PriorityBadge({ priority }: { priority: CenterActivityPriority }) {
  const label = {
    info: "Informativo",
    followup: "Seguimiento",
    attention: "Requiere intervención"
  }[priority];
  const tone = {
    info: "green",
    followup: "blue",
    attention: "amber"
  }[priority] as "green" | "blue" | "amber";

  return <GradebookBadge tone={tone}>{label}</GradebookBadge>;
}

function groupActivityItems(items: CenterActivityItem[], groupRoutes?: CenterActivityGroupRoutes) {
  const grouped: CenterActivityItem[] = [];
  let index = 0;

  while (index < items.length) {
    const current = items[index];
    const groupKey = current.groupKey ?? current.id;
    const group = [current];
    let nextIndex = index + 1;

    while (nextIndex < items.length && (items[nextIndex].groupKey ?? items[nextIndex].id) === groupKey) {
      group.push(items[nextIndex]);
      nextIndex += 1;
    }

    if (group.length >= 3) {
      grouped.push({
        ...current,
        id: `${groupKey}-${group.length}`,
        title: buildGroupedTitle(current, group.length),
        meta: `${group.length} movimientos relacionados en poco tiempo.`,
        href: hrefForGroup(current, groupRoutes),
        actionLabel: "Ver detalle"
      });
    } else {
      grouped.push(...group);
    }

    index = nextIndex;
  }

  return grouped;
}

function buildGroupedTitle(item: CenterActivityItem, count: number) {
  if (item.category === "communications") return `${count} movimientos de comunicación`;
  if (item.kind === "attendance") return `${count} registros de asistencia`;
  if (item.kind === "report") return `${count} publicaciones académicas`;
  if (item.category === "incidents") return `${count} incidencias registradas`;
  return `${count} movimientos del centro`;
}

function hrefForGroup(item: CenterActivityItem, groupRoutes?: CenterActivityGroupRoutes) {
  if (item.category === "communications") return groupRoutes?.communications ?? "/dashboard/director/communications";
  if (item.category === "academic") return groupRoutes?.academic ?? "/dashboard/director/gradebook";
  if (item.category === "incidents") return groupRoutes?.incidents ?? "/dashboard/director/students";
  if (item.category === "calendar") return groupRoutes?.calendar ?? "/dashboard/director/calendar";
  return item.href;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const dateParts = getMadridDateParts(date);
  const todayParts = getMadridDateParts(now);
  const yesterdayParts = getMadridDateParts(new Date(now.getTime() - day));
  const time = `${dateParts.hour}:${dateParts.minute}`;

  if (dateParts.dateKey === todayParts.dateKey) {
    return `Hoy · ${time}`;
  }

  if (dateParts.dateKey === yesterdayParts.dateKey) {
    return `Ayer · ${time}`;
  }

  return `${dateParts.day} de ${monthNames[dateParts.month - 1]} · ${time}`;
}

function getMadridDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const hour = part("hour").padStart(2, "0");
  const minute = part("minute").padStart(2, "0");

  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    day,
    month,
    hour,
    minute
  };
}

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
];

const toneClass = {
  blue: "text-sky-700 bg-sky-50 ring-sky-100",
  green: "text-emerald-700 bg-emerald-50 ring-emerald-100",
  amber: "text-amber-700 bg-amber-50 ring-amber-100",
  gray: "text-slate-600 bg-slate-50 ring-slate-100",
  red: "text-red-700 bg-red-50 ring-red-100"
} satisfies Record<CenterActivityTone, string>;

const softToneClass = {
  blue: "bg-sky-50 text-sky-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  gray: "bg-slate-100 text-slate-600",
  red: "bg-red-50 text-red-700"
} satisfies Record<CenterActivityTone, string>;

const kindLabel = {
  communication: "Comunicación",
  reply: "Respuesta",
  incident: "Incidencia",
  attendance: "Asistencia",
  grade: "Evaluación",
  report: "Boletín",
  calendar: "Calendario",
  system: "Sistema"
} satisfies Record<CenterActivityKind, string>;

const iconByKind = {
  communication: MessageSquareText,
  reply: MessageCircleReply,
  incident: AlertCircle,
  attendance: CheckCircle2,
  grade: BookOpenCheck,
  report: FileText,
  calendar: CalendarDays,
  system: ShieldCheck
} satisfies Record<CenterActivityKind, LucideIcon>;



