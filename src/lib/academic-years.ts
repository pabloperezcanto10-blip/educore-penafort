import { createClient } from "@/lib/supabase/server";
import { getActiveSchoolContext } from "@/lib/schools/context";

export type AcademicYear = {
  id: string;
  school_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
};

const academicYearSelect = "id,school_id,name,start_date,end_date,active,created_at";

export async function getActiveAcademicYear(
  schoolId?: string
): Promise<{
  academicYear: AcademicYear | null;
  errorMessage: string | null;
}> {
  const resolvedSchoolId = schoolId ?? (await getActiveSchoolContext())?.schoolId;
  if (!resolvedSchoolId) {
    return {
      academicYear: null,
      errorMessage: "Selecciona un centro para consultar el curso escolar."
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(academicYearSelect)
    .eq("school_id", resolvedSchoolId)
    .eq("active", true)
    .maybeSingle<AcademicYear>();

  if (error) {
    return { academicYear: null, errorMessage: error.message };
  }

  return { academicYear: data, errorMessage: null };
}

export async function getAcademicYears(
  schoolId?: string
): Promise<{
  academicYears: AcademicYear[];
  errorMessage: string | null;
}> {
  const resolvedSchoolId = schoolId ?? (await getActiveSchoolContext())?.schoolId;
  if (!resolvedSchoolId) {
    return {
      academicYears: [],
      errorMessage: "Selecciona un centro para consultar los cursos escolares."
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(academicYearSelect)
    .eq("school_id", resolvedSchoolId)
    .order("start_date", { ascending: false })
    .order("name", { ascending: false })
    .returns<AcademicYear[]>();

  if (error) {
    return { academicYears: [], errorMessage: error.message };
  }

  return { academicYears: data ?? [], errorMessage: null };
}
