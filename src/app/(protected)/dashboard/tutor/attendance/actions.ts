"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStudentsForTutor } from "@/lib/tutors/students";
import { getTodayDate, type AttendanceStatus } from "@/lib/attendance/attendance";
import { createInternalNotifications, type InternalNotificationInsert } from "@/lib/internal-notifications";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

const statuses = ["present", "absent", "late"] as const;

export async function saveDailyAttendance(formData: FormData) {
  const profile = await requireRole("tutor");
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesión activa.");
  }

  const tutorId = user.id ?? profile.id;
  const date = String(formData.get("date") ?? getTodayDate());
  const studentIds = formData.getAll("student_id").map((value) => String(value));
  const { students, errorMessage } = await getStudentsForTutor(tutorId);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const allowedStudentIds = new Set(students.map((student) => student.id));
  const records: Database["public"]["Tables"]["student_attendance"]["Insert"][] = studentIds
    .filter((studentId) => allowedStudentIds.has(studentId))
    .map((studentId) => {
      const statusValue = String(formData.get(`status_${studentId}`) ?? "present");
      const status: AttendanceStatus = statuses.includes(statusValue as AttendanceStatus)
        ? (statusValue as AttendanceStatus)
        : "present";
      const notes = String(formData.get(`notes_${studentId}`) ?? "").trim();

      return {
        student_id: studentId,
        tutor_id: tutorId,
        status,
        date,
        notes: notes || null
      };
    });

  if (records.length === 0) {
    throw new Error("No hay alumnos para guardar asistencia.");
  }

  const { error } = await supabase
    .from("student_attendance")
    .upsert(records as never, { onConflict: "academic_year_id,student_id,date" });

  if (error) {
    throw new Error(error.message);
  }

  await notifyFamiliesAboutPendingAttendance(supabase, records);

  revalidatePath("/dashboard/tutor/attendance");
  revalidatePath("/dashboard/family");
  redirect(withToast("/dashboard/tutor/attendance", "success", "Asistencia guardada correctamente."));
}

async function notifyFamiliesAboutPendingAttendance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  records: Database["public"]["Tables"]["student_attendance"]["Insert"][]
) {
  const relevantRecords = records.filter((record) => record.status === "absent" || record.status === "late");

  if (relevantRecords.length === 0) return;

  const studentIds = Array.from(new Set(relevantRecords.map((record) => record.student_id)));
  const { data: families } = await supabase
    .from("parent_students")
    .select("parent_id,student_id")
    .in("student_id", studentIds)
    .returns<{ parent_id: string; student_id: string }[]>();

  const recordsByStudent = new Map(relevantRecords.map((record) => [record.student_id, record]));
  const notifications: InternalNotificationInsert[] = [];

  (families ?? []).forEach((family) => {
    const record = recordsByStudent.get(family.student_id);

    if (!record) return;

    const label = record.status === "absent" ? "falta" : "retraso";

    notifications.push({
      user_id: family.parent_id,
      role: "family",
      type: "pending_attendance_justification",
      title: `${label.charAt(0).toUpperCase() + label.slice(1)} pendiente de justificar`,
      body: `Hay una ${label} registrada el ${record.date}.`,
      related_entity_type: "student",
      related_entity_id: family.student_id,
      related_href: "/dashboard/family/communications"
    });
  });

  await createInternalNotifications(notifications);
}
