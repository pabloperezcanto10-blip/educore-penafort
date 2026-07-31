import type { Profile } from "@/lib/auth/session";
import { getActiveAcademicYear, type AcademicYear } from "@/lib/academic-years";
import {
  requireOperationalSchoolContext,
  type SchoolContextError
} from "@/lib/schools/context";

export type AcademicOperationContext = {
  schoolId: string;
  academicYearId: string;
  academicYear: AcademicYear;
};

export class AcademicContextError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ACADEMIC_CONTEXT_UNAVAILABLE"
      | "ACADEMIC_YEAR_REQUIRED"
      | "ACADEMIC_RESOURCE_OUT_OF_SCOPE"
  ) {
    super(message);
    this.name = "AcademicContextError";
  }
}

export async function requireAcademicOperationContext(
  profile?: Profile
): Promise<AcademicOperationContext> {
  const schoolContext = await requireOperationalSchoolContext(profile);
  const { academicYear, errorMessage } = await getActiveAcademicYear(
    schoolContext.schoolId
  );

  if (errorMessage) {
    throw new AcademicContextError(
      errorMessage,
      "ACADEMIC_CONTEXT_UNAVAILABLE"
    );
  }

  if (!academicYear) {
    throw new AcademicContextError(
      "No hay un curso escolar activo para el centro seleccionado.",
      "ACADEMIC_YEAR_REQUIRED"
    );
  }

  if (academicYear.school_id !== schoolContext.schoolId) {
    throw new AcademicContextError(
      "El curso escolar activo no pertenece al centro seleccionado.",
      "ACADEMIC_CONTEXT_UNAVAILABLE"
    );
  }

  return {
    schoolId: schoolContext.schoolId,
    academicYearId: academicYear.id,
    academicYear
  };
}

export function academicReadError(
  _error: unknown,
  fallback = "No se pudieron consultar los datos académicos."
) {
  return fallback;
}

export function academicWriteError(
  _error: unknown,
  fallback = "No se pudieron guardar los datos académicos."
) {
  return new Error(fallback);
}

export function isAcademicContextError(
  error: unknown
): error is AcademicContextError | SchoolContextError {
  return (
    error instanceof AcademicContextError ||
    (error instanceof Error && error.name === "SchoolContextError")
  );
}
