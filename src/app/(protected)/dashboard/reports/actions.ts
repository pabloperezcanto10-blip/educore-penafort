"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditAction } from "@/lib/audit";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createInternalNotifications, type InternalNotificationInsert } from "@/lib/internal-notifications";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

const validTerms = ["1", "2", "3"] as const;

type EvaluationPublicationInsert = Database["public"]["Tables"]["evaluation_publications"]["Insert"];

export async function publishEvaluation(formData: FormData) {
  const profile = await getCurrentUserProfile();

  if (!profile || (profile.role !== "director" && profile.role !== "superadmin")) {
    throw new Error("No tienes permisos para publicar evaluaciones.");
  }

  const courseId = String(formData.get("course_id") ?? "").trim();
  const termValue = String(formData.get("term") ?? "1");
  const term = validTerms.includes(termValue as (typeof validTerms)[number])
    ? (termValue as (typeof validTerms)[number])
    : "1";

  if (!courseId) {
    throw new Error("Selecciona un curso antes de publicar la evaluacion.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesion activa.");
  }

  const row: EvaluationPublicationInsert = {
    course_id: courseId,
    term,
    published: true,
    published_at: new Date().toISOString(),
    published_by: user.id
  };

  const { error } = await supabase
    .from("evaluation_publications")
    .upsert(row as never, { onConflict: "academic_year_id,course_id,term" });

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction({
    actorUserId: user.id,
    actorRole: profile.role,
    action: "evaluation_published",
    module: "reports",
    entityType: "evaluation_publication",
    entityId: null,
    afterData: {
      course_id: courseId,
      term,
      published: true
    }
  });

  await notifyFamiliesAboutPublishedReport(supabase, courseId, term);

  revalidatePath("/dashboard/director/reports");
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/director/gradebook");
  revalidatePath("/dashboard/admin/gradebook");
  revalidatePath("/dashboard/tutor/gradebook");
  const target = profile.role === "director" ? "/dashboard/director/gradebook" : "/dashboard/admin/gradebook";
  redirect(withToast(`${target}?course_id=${courseId}&term=${term}`, "success", "Boletines publicados correctamente."));
}

async function notifyFamiliesAboutPublishedReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  term: (typeof validTerms)[number]
) {
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("course_id", courseId)
    .returns<{ id: string }[]>();

  const studentIds = (students ?? []).map((student) => student.id);

  if (studentIds.length === 0) return;

  const { data: families } = await supabase
    .from("parent_students")
    .select("parent_id,student_id")
    .in("student_id", studentIds)
    .returns<{ parent_id: string; student_id: string }[]>();

  const notifications: InternalNotificationInsert[] = (families ?? []).map((family) => ({
    user_id: family.parent_id,
    role: "family",
    type: "report_published",
    title: "Boletín disponible",
    body: `Ya está publicado el boletín del trimestre ${term}.`,
    related_entity_type: "student",
    related_entity_id: family.student_id,
    related_href: "/dashboard/family/grades"
  }));

  await createInternalNotifications(notifications);
}
