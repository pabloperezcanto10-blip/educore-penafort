import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox, Send } from "lucide-react";

import { GradebookBadge, GradebookCard } from "@/components/grades/gradebook-design";

type BadgeTone = "gray" | "blue" | "green" | "amber" | "red";

export type CommunicationBadgeItem = {
  label: string;
  tone?: BadgeTone;
};

export function CommunicationBadge({ children, tone = "gray" }: { children: ReactNode; tone?: BadgeTone }) {
  return <GradebookBadge tone={tone}>{children}</GradebookBadge>;
}

export function CommunicationSummaryBadges({ items }: { items: Array<{ label: string; value: string | number; tone?: BadgeTone }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <GradebookBadge key={item.label} tone={item.tone ?? "gray"}>
          {item.label}: {item.value}
        </GradebookBadge>
      ))}
    </div>
  );
}

export function CommunicationFilterCard({ children }: { children: ReactNode }) {
  return <GradebookCard className="p-4">{children}</GradebookCard>;
}

export function CommunicationEmptyState({
  title,
  description,
  className = ""
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center ${className}`}>
      <Inbox className="mx-auto h-8 w-8 text-sky-700" aria-hidden="true" />
      <h2 className="mt-3 text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function CommunicationWorkspace({ children }: { children: ReactNode }) {
  return (
    <GradebookCard className="overflow-hidden">
      <div className="grid min-h-[640px] xl:grid-cols-[400px_1fr]">{children}</div>
    </GradebookCard>
  );
}

export function ConversationListCard({
  href,
  active,
  title,
  subtitle,
  date,
  preview,
  badges,
  unreadCount
}: {
  href: string;
  active: boolean;
  title: string;
  subtitle?: string;
  date: string;
  preview: string;
  badges: CommunicationBadgeItem[];
  unreadCount?: number;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-3 transition ${
        active ? "border-sky-200 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={`truncate text-sm text-slate-950 ${unreadCount ? "font-bold" : "font-semibold"}`}>{title}</p>
            {unreadCount ? <span className="h-2 w-2 shrink-0 rounded-full bg-sky-700" aria-label="Sin leer" /> : null}
          </div>
          {subtitle ? <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <time className="shrink-0 text-xs text-slate-500">{date}</time>
      </div>
      <p className={`mt-2 line-clamp-2 text-sm ${unreadCount ? "font-medium text-slate-700" : "text-slate-500"}`}>{preview}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {badges.map((badge) => (
          <CommunicationBadge key={`${badge.label}-${badge.tone ?? "gray"}`} tone={badge.tone}>
            {badge.label}
          </CommunicationBadge>
        ))}
        {unreadCount ? <CommunicationBadge tone="blue">{unreadCount} sin leer</CommunicationBadge> : null}
      </div>
    </Link>
  );
}

export function ConversationContextGrid({ items }: { items: Array<{ label: string; value: string | null | undefined }> }) {
  const visibleItems = items.filter((item) => item.value && item.value !== "Sin alumno" && item.value !== "Sin curso");

  if (visibleItems.length === 0) return null;

  return (
    <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
      {visibleItems.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="font-semibold uppercase tracking-[0.08em] text-slate-400">{item.label}</dt>
          <dd className="mt-1 truncate font-semibold text-slate-950">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CommunicationMessageBubble({
  sent,
  title,
  meta,
  badges,
  message
}: {
  sent?: boolean;
  title: string;
  meta: string;
  badges: CommunicationBadgeItem[];
  message: string;
}) {
  return (
    <article className={`flex ${sent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-2xl rounded-2xl border px-4 py-3 shadow-sm ${sent ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {sent ? <Send className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" /> : <Inbox className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />}
          <span className="font-semibold text-slate-950">{title}</span>
          <span>{meta}</span>
        </div>
        {badges.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <CommunicationBadge key={`${badge.label}-${badge.tone ?? "gray"}`} tone={badge.tone}>
                {badge.label}
              </CommunicationBadge>
            ))}
          </div>
        ) : null}
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{message}</p>
      </div>
    </article>
  );
}