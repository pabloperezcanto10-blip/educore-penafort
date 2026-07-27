import { createClient } from "@/lib/supabase/server";
import { DEFAULT_OPERATIONAL_SCHOOL_ID } from "@/lib/schools/constants";

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
  schoolId = DEFAULT_OPERATIONAL_SCHOOL_ID
): Promise<{
  academicYear: AcademicYear | null;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(academicYearSelect)
    .eq("school_id", schoolId)
    .eq("active", true)
    .maybeSingle<AcademicYear>();

  if (error) {
    return { academicYear: null, errorMessage: error.message };
  }

  return { academicYear: data, errorMessage: null };
}

export async function getAcademicYears(
  schoolId = DEFAULT_OPERATIONAL_SCHOOL_ID
): Promise<{
  academicYears: AcademicYear[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(academicYearSelect)
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false })
    .order("name", { ascending: false })
    .returns<AcademicYear[]>();

  if (error) {
    return { academicYears: [], errorMessage: error.message };
  }

  return { academicYears: data ?? [], errorMessage: null };
}
