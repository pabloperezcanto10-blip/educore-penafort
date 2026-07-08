"use client";

import { Printer } from "lucide-react";

export function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimir / Guardar como PDF
    </button>
  );
}
