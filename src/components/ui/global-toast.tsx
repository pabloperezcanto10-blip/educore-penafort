"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { ToastType } from "@/lib/toast";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

const toastConfig: Record<
  ToastType,
  {
    icon: string;
    duration: number | null;
    container: string;
    iconClass: string;
  }
> = {
  success: {
    icon: "✓",
    duration: 3500,
    container: "border-emerald-200 bg-emerald-50 text-emerald-950",
    iconClass: "bg-emerald-600 text-white"
  },
  error: {
    icon: "✕",
    duration: 5600,
    container: "border-red-200 bg-red-50 text-red-950",
    iconClass: "bg-red-600 text-white"
  },
  warning: {
    icon: "⚠",
    duration: null,
    container: "border-amber-200 bg-amber-50 text-amber-950",
    iconClass: "bg-amber-500 text-white"
  },
  info: {
    icon: "ℹ",
    duration: 4000,
    container: "border-sky-200 bg-sky-50 text-sky-950",
    iconClass: "bg-sky-600 text-white"
  }
};

function normalizeToastType(value: string | null): ToastType {
  if (value === "success" || value === "error" || value === "warning" || value === "info") {
    return value;
  }

  return "info";
}

export function GlobalToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toastId = searchParams.get("toast_id");
  const message = searchParams.get("toast_message");
  const type = normalizeToastType(searchParams.get("toast_type"));
  const handledToastId = useRef<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const cleanHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast_type");
    params.delete("toast_message");
    params.delete("toast_id");
    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!message || !toastId || handledToastId.current === toastId) return;

    handledToastId.current = toastId;
    setToasts((current) => {
      const next = current.filter((toast) => toast.id !== toastId);
      return [{ id: toastId, message, type }, ...next].slice(0, 3);
    });
    router.replace(cleanHref, { scroll: false });
  }, [cleanHref, message, router, toastId, type]);

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const config = toastConfig[toast.type];

  useEffect(() => {
    if (config.duration === null) return;

    const timeout = window.setTimeout(onDismiss, config.duration);
    return () => window.clearTimeout(timeout);
  }, [config.duration, onDismiss]);

  return (
    <div className={`rounded-lg border p-4 shadow-lg transition ${config.container}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${config.iconClass}`}>
          {config.icon}
        </span>
        <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 transition hover:bg-white/70"
          aria-label="Cerrar notificacion"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
