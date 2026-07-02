import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type FamilyLabelClient = ReturnType<typeof createAdminClient>;

export type FamilyVisibleIncident = {
  id: string;
  student_id: string;
  type: string;
  description: string;
  severity: "leve" | "media" | "grave";
  created_at: string;
};

export async function getFamilyVisibleIncidents(
  familyId: string,
  studentFilterId?: string
): Promise<{
  incidents: FamilyVisibleIncident[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data: relations, error: relationsError } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", familyId)
    .returns<{ student_id: string }[]>();

  if (relationsError) {
    return { incidents: [], errorMessage: relationsError.message };
  }

  const allowedStudentIds = (relations ?? []).map((relation) => relation.student_id);
  const studentIds = studentFilterId
    ? allowedStudentIds.filter((studentId) => studentId === studentFilterId)
    : allowedStudentIds;

  if (studentIds.length === 0) {
    return { incidents: [], errorMessage: null };
  }

  const labelClient = await createFamilyLabelClient();
  const { data, error } = await labelClient
    .from("student_incidents")
    .select("id,student_id,type,description,severity,created_at")
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<FamilyVisibleIncident[]>();

  if (error) {
    return { incidents: [], errorMessage: error.message };
  }

  return { incidents: data ?? [], errorMessage: null };
}

async function createFamilyLabelClient(): Promise<FamilyLabelClient> {
  if (hasSupabaseAdminClient()) {
    return createAdminClient();
  }

  return (await createClient()) as unknown as FamilyLabelClient;
}
