import { createClient } from "@/lib/supabase/server";

export type AcademicYear = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
};

const academicYearSelect = "id,name,start_date,end_date,active,created_at";

export async function getActiveAcademicYear(): Promise<{
  academicYear: AcademicYear | null;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(academicYearSelect)
    .eq("active", true)
    .maybeSingle<AcademicYear>();

  if (error) {
    return { academicYear: null, errorMessage: error.message };
  }

  return { academicYear: data, errorMessage: null };
}

export async function getAcademicYears(): Promise<{
  academicYears: AcademicYear[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(academicYearSelect)
    .order("start_date", { ascending: false })
    .order("name", { ascending: false })
    .returns<AcademicYear[]>();

  if (error) {
    return { academicYears: [], errorMessage: error.message };
  }

  return { academicYears: data ?? [], errorMessage: null };
}
