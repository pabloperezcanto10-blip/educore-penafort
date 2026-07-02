"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { register } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      {pending ? "Creando..." : "Crear cuenta"}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(register, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium text-foreground">
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

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
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium text-foreground">
          Rol
        </label>
        <select
          id="role"
          name="role"
          defaultValue="family"
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="family">Family</option>
          <option value="tutor">Tutor</option>
          <option value="director">Director</option>
        </select>
      </div>

      {state.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
