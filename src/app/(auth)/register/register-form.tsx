import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function RegisterForm() {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Registro público desactivado</p>
            <p className="mt-1 text-amber-800">
              Las cuentas se crean mediante un proceso autorizado por la administración del
              centro.
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
      >
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
