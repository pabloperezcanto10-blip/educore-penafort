"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCheck, Inbox } from "lucide-react";
import { markDashboardPendingReviewed } from "@/app/(protected)/dashboard/notifications/actions";
import { GradebookBadge, GradebookCard } from "@/components/grades/gradebook-design";
import type { DashboardNotification } from "@/lib/internal-notifications";

type CompactDashboardNotificationsProps = {
  notifications: DashboardNotification[];
  unreadCount: number;
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
};

export function CompactDashboardNotifications({
  notifications,
  unreadCount,
  title = "Novedades",
  emptyMessage = "No hay avisos pendientes.",
  maxItems = 2
}: CompactDashboardNotificationsProps) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setHiddenIds([]);
  }, [notifications]);

  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const visibleNotifications = notifications.filter(
    (notification) => !hidden.has(notification.reviewKey)
  );
  const hiddenUnreadCount = notifications.filter(
    (notification) => hidden.has(notification.reviewKey) && !notification.read
  ).length;
  const visibleUnreadCount = Math.max(0, unreadCount - hiddenUnreadCount);

  function review(notification: DashboardNotification) {
    if (!notification.reviewable || isPending) return;

    setErrorMessage(null);
    setHiddenIds((current) => [...current, notification.reviewKey]);
    startTransition(async () => {
      const result = await markDashboardPendingReviewed({
        id: notification.id,
        source: notification.source,
        reviewKey: notification.reviewKey,
        reviewVersion: notification.reviewVersion
      });

      if (!result.ok) {
        setHiddenIds((current) => current.filter((id) => id !== notification.reviewKey));
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <GradebookCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {visibleUnreadCount > 0
                ? `${visibleUnreadCount} aviso${visibleUnreadCount === 1 ? "" : "s"} pendiente${visibleUnreadCount === 1 ? "" : "s"}.`
                : emptyMessage}
            </p>
          </div>
        </div>
        <GradebookBadge tone={visibleUnreadCount > 0 ? "amber" : "green"}>
          {visibleUnreadCount > 0 ? "Revisar" : "Sin avisos"}
        </GradebookBadge>
      </div>

      {visibleNotifications.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleNotifications.slice(0, maxItems).map((notification) => (
            <article
              key={`${notification.source}-${notification.id}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-white"
            >
              <Link href={notification.href} className="block min-w-0">
                <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{notification.body}</p>
              </Link>
              {notification.reviewable ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => review(notification)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 transition hover:text-sky-900 disabled:cursor-wait disabled:opacity-60"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Marcar como revisado
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 text-xs font-medium text-red-600">{errorMessage}</p>
      ) : null}
    </GradebookCard>
  );
}
