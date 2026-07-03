"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { deleteImportedCourseWithResult, deleteImportedStudentWithResult } from "./actions";

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

export function DeleteStudentActionButton({ studentId }: { studentId: string }) {
  return (
    <DeleteActionButton
      label="Borrar alumno"
      variant="outline"
      confirmTitle="Borrar alumno"
      confirmMessage="Esta accion eliminara el alumno y posibles familias asociadas. No se puede deshacer."
      onConfirm={() => deleteImportedStudentWithResult({ studentId })}
    />
  );
}

export function DeleteCourseActionButton({ courseId }: { courseId: string }) {
  return (
    <DeleteActionButton
      label="Borrar curso completo"
      confirmTitle="Borrar curso completo"
      confirmMessage="Esta accion eliminara todos los alumnos del curso y posibles familias asociadas. No se puede deshacer."
      onConfirm={() => deleteImportedCourseWithResult({ courseId })}
    />
  );
}

function DeleteActionButton({
  label,
  confirmTitle,
  confirmMessage,
  onConfirm,
  variant = "danger"
}: {
  label: string;
  confirmTitle: string;
  confirmMessage: string;
  onConfirm: () => Promise<{ success: boolean; message: string }>;
  variant?: "danger" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const className =
    variant === "danger"
      ? "inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      setToast({ type: result.success ? "success" : "error", message: result.message });

      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button type="button" disabled={isPending} onClick={() => setOpen(true)} className={className}>
        {isPending ? "Borrando datos..." : label}
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
                disabled={isPending}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? "Borrando datos..." : "Confirmar borrado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <InlineToast toast={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}

function InlineToast({
  toast,
  onClose
}: {
  toast: { type: "success" | "error" | "warning"; message: string };
  onClose: () => void;
}) {
  const styles = toast.type === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : toast.type === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-red-200 bg-red-50 text-red-950";

  return (
    <div className={`fixed right-4 top-4 z-[60] w-[calc(100vw-2rem)] max-w-sm rounded-lg border p-4 shadow-lg ${styles}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <button type="button" onClick={onClose} className="rounded-md p-1 transition hover:bg-white/70" aria-label="Cerrar notificacion">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}