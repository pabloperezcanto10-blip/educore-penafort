"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditAction } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import {
  academicWriteError,
  requireAcademicOperationContext
} from "@/lib/grades/context";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";

export async function publishFinalEvaluation(formData: FormData) {
  const profile = await requireRole(["director", "superadmin"]);
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext(profile);

  const courseId = String(formData.get("course_id") ?? "").trim();

  if (!courseId) {
    throw new Error("Selecciona un curso.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesion activa.");
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<{ id: string }>();

  if (courseError || !course) {
    throw new Error("El curso no pertenece al contexto académico activo.");
  }

  const { error } = await supabase.from("final_evaluation_publications").upsert(
    {
      school_id: schoolId,
      academic_year_id: academicYearId,
      course_id: courseId,
      published: true,
      published_at: new Date().toISOString(),
      published_by: user.id
    } as never,
    { onConflict: "school_id,academic_year_id,course_id" }
  );

  if (error) {
    throw academicWriteError(error, "No se pudo publicar el boletín final.");
  }

  await logAuditAction({
    actorUserId: user.id,
    actorRole: profile.role,
    action: "evaluation_published",
    module: "final_reports",
    entityType: "final_evaluation_publication",
    entityId: null,
    afterData: {
      course_id: courseId,
      published: true
    }
  });

  revalidatePath("/dashboard/director/final-grades");
  revalidatePath("/dashboard/admin/final-grades");
  revalidatePath("/dashboard/family/grades");
  const target = profile.role === "director" ? "/dashboard/director/final-grades" : "/dashboard/admin/final-grades";
  redirect(withToast(`${target}?course_id=${courseId}`, "success", "Boletin final publicado correctamente."));
}
