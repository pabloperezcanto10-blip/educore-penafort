"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { formatMadridDateTime } from "@/lib/date-time/madrid";

export function MadridDateTime({ initialIso }: { initialIso: string }) {
  const [instant, setInstant] = useState(initialIso);

  useEffect(() => {
    const update = () => setInstant(new Date().toISOString());
    const delay = 60_000 - (Date.now() % 60_000);
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      update();
      intervalId = setInterval(update, 60_000);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <p className="flex min-w-0 items-center justify-start gap-1.5 text-[11px] font-medium text-slate-500 sm:justify-end sm:text-xs">
      <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      <time className="truncate" dateTime={instant}>{formatMadridDateTime(instant)}</time>
    </p>
  );
}
