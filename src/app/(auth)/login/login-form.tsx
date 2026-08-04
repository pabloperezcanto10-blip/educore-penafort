"use client";

import { useFormState, useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import { login } from "./actions";

function SubmitButton({ primaryColor }: { primaryColor: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
      style={{ backgroundColor: primaryColor }}
    >
      <LogIn className="h-4 w-4" aria-hidden="true" />
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

type LoginFormProps = {
  schoolSlug: string;
  schoolName: string;
  primaryColor: string;
};

export function LoginForm({
  schoolSlug,
  schoolName,
  primaryColor
}: LoginFormProps) {
  const [state, formAction] = useFormState(login, {});

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="school" value={schoolSlug} />
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {state.message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <SubmitButton primaryColor={primaryColor} />

      <p className="text-center text-sm text-muted-foreground">
        Acceso exclusivo para cuentas vinculadas a {schoolName}.
      </p>
    </form>
  );
}
