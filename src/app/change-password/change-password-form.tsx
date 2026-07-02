"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { changePassword } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <KeyRound className="h-4 w-4" aria-hidden="true" />
      {pending ? "Actualizando..." : "Cambiar contrasena"}
    </button>
  );
}

export function ChangePasswordForm({
  canReturn,
  dashboardHref
}: {
  canReturn: boolean;
  dashboardHref: string;
}) {
  const [state, formAction] = useFormState(changePassword, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="current_password" className="text-sm font-medium text-foreground">
          Contrasena actual
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="new_password" className="text-sm font-medium text-foreground">
          Nueva contrasena
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <p className="text-xs text-muted-foreground">
          Minimo 8 caracteres, una mayuscula, una minuscula y un numero.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm_password" className="text-sm font-medium text-foreground">
          Confirmar nueva contrasena
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {state.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      {canReturn ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href={dashboardHref} className="font-medium text-primary">
            Volver al panel
          </Link>
        </p>
      ) : null}
    </form>
  );
}
