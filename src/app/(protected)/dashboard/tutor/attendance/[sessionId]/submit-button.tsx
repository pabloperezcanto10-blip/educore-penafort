"use client";

import { CalendarCheck } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SaveSessionAttendanceButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <CalendarCheck className="h-4 w-4" aria-hidden="true" />
      {pending ? "Guardando asistencia..." : "Guardar asistencia"}
    </button>
  );
}
