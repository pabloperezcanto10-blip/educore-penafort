import { getActiveAcademicYear } from "@/lib/academic-years";
import { createClient } from "@/lib/supabase/server";

export type ActiveCourse = {
  id: string;
  name: string;
  academic_year_id: string | null;
};

export async function getActiveCourses(): Promise<{
  courses: ActiveCourse[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { academicYear, errorMessage: academicYearError } = await getActiveAcademicYear();

  if (!academicYear) {
    return { courses: [], errorMessage: academicYearError ?? "No hay curso escolar activo." };
  }

  const { data, error } = await supabase
    .from("courses")
    .select("id,name,academic_year_id")
    .eq("academic_year_id", academicYear.id)
    .order("name", { ascending: true })
    .returns<ActiveCourse[]>();

  if (error) {
    return { courses: [], errorMessage: error.message };
  }

  return { courses: data ?? [], errorMessage: null };
}
