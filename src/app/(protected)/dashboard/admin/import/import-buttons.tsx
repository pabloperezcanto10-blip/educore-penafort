"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function PreviewSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Generando vista previa..." : "Vista previa"}
    </button>
  );
}

export function ConfirmImportButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Importando alumnos y familias..." : "Confirmar importacion"}
    </button>
  );
}

export function DeleteImportButton({
  label,
  loadingLabel = "Borrando datos...",
  confirmTitle = "Confirmar borrado",
  confirmMessage = "Esta accion eliminara alumnos y posibles familias asociadas. No se puede deshacer.",
  variant = "danger"
}: {
  label: string;
  loadingLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  variant?: "danger" | "outline";
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const className =
    variant === "danger"
      ? "inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      <button type="button" disabled={pending} onClick={() => setOpen(true)} className={className}>
        {pending ? loadingLabel : label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">{confirmTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{confirmMessage}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
              >
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                {pending ? loadingLabel : "Confirmar borrado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
