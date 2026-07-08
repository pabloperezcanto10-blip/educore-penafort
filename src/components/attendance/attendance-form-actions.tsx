"use client";

import { RotateCcw, UserCheck } from "lucide-react";

export function AttendanceBulkActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={(event) => {
          const form = event.currentTarget.closest("form");
          form?.querySelectorAll<HTMLInputElement>('input[type="radio"][value="present"]').forEach((input) => {
            input.checked = true;
          });
        }}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Marcar todos presentes
      </button>
      <button
        type="reset"
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Limpiar cambios
      </button>
    </div>
  );
}
