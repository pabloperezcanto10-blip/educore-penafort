import { Building2, Check, Globe2 } from "lucide-react";
import Link from "next/link";
import {
  clearActiveSchool,
  selectActiveSchool
} from "@/app/school-context/actions";
import { getRoleLabel } from "@/lib/auth/roles";
import type { ActiveSchoolContext } from "@/lib/schools/types";

export function SchoolSwitcher({
  context
}: {
  context: ActiveSchoolContext;
}) {
  const shouldShow =
    context.availableSchools.length > 1 ||
    (context.isGlobalSuperadmin && context.availableSchools.length > 0);

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <Link
        href="/select-school"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-primary md:hidden"
        aria-label="Cambiar centro"
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
      </Link>
      <div className="hidden items-center gap-2 md:flex">
        <form action={selectActiveSchool} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="active-school">
          Centro activo
        </label>
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-primary">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <select
          id="active-school"
          name="school_id"
          defaultValue={context.schoolId ?? ""}
          className="h-9 max-w-[230px] rounded-md border border-border bg-white px-3 text-xs font-semibold text-slate-700"
          aria-label="Seleccionar centro activo"
        >
          <option value="" disabled>
            Selecciona un centro
          </option>
          {context.availableSchools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.shortName} · {school.roles.map(getRoleLabel).join(", ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Cambiar
        </button>
        </form>

        {context.isGlobalSuperadmin && context.schoolId ? (
          <form action={clearActiveSchool}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Globe2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Vista global
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
