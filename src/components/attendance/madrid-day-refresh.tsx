"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMadridDate } from "@/lib/date-time/madrid";

export function MadridDayRefresh({ renderedDate }: { renderedDate: string }) {
  const router = useRouter();

  useEffect(() => {
    let requestedDate: string | null = null;
    const checkDate = () => {
      if (document.visibilityState !== "visible") return;
      const today = getMadridDate();
      if (today !== renderedDate && today !== requestedDate) {
        requestedDate = today;
        router.refresh();
      }
    };
    checkDate();
    const timer = window.setInterval(checkDate, 30_000);
    document.addEventListener("visibilitychange", checkDate);
    window.addEventListener("focus", checkDate);
    window.addEventListener("pageshow", checkDate);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkDate);
      window.removeEventListener("focus", checkDate);
      window.removeEventListener("pageshow", checkDate);
    };
  }, [renderedDate, router]);

  return null;
}
