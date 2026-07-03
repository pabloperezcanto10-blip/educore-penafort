"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { getTodayDate } from "@/lib/attendance/attendance";
import type { SessionAttendanceStatus } from "@/lib/attendance/session-attendance";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

const statuses = ["present", "absent", "late", "justified"] as const;

type AttendanceRecordInsert = Database["public"]["Tables"]["attendance_records"]["Insert"];
type ExistingRecord = Pick<
  Database["public"]["Tables"]["attendance_records"]["Row"],
  "id" | "student_id" | "status" | "notes"
>;

export async function saveSessionAttendance(formData: FormData) {
  const profile = await requireRole("tutor");
  const sessionId = String(formData.get("session_id") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "").trim();
  const subjectIdValue = String(formData.get("subject_id") ?? "").trim();
  const subjectId = subjectIdValue || null;
  const date = String(formData.get("attendance_date") ?? getTodayDate()).trim();
  const studentIds = formData.getAll("student_id").map((value) => String(value));

  if (!sessionId || !courseId || studentIds.length === 0) {
    redirect(withToast(`/dashboard/tutor/attendance/${sessionId || ""}`, "error", "No se pudo guardar la asistencia."));
  }

  const supabase = await createClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("teacher_schedule")
    .select("id,teacher_id")
    .eq("id", sessionId)
    .eq("teacher_id", profile.id)
    .maybeSingle<{ id: string; teacher_id: string }>();

  if (scheduleError || !schedule) {
    redirect(withToast(`/dashboard/tutor/attendance/${sessionId}`, "error", "No se pudo guardar la asistencia."));
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("course_id", courseId)
    .eq("active", true)
    .in("id", studentIds)
    .returns<{ id: string }[]>();

  if (studentsError || !students || students.length === 0) {
    redirect(withToast(`/dashboard/tutor/attendance/${sessionId}`, "error", "No se pudo guardar la asistencia."));
  }

  const allowedStudentIds = new Set(students.map((student) => student.id));
  const records: AttendanceRecordInsert[] = studentIds
    .filter((studentId) => allowedStudentIds.has(studentId))
    .map((studentId) => {
      const statusValue = String(formData.get(`status_${studentId}`) ?? "present");
      const status: SessionAttendanceStatus = statuses.includes(statusValue as SessionAttendanceStatus)
        ? (statusValue as SessionAttendanceStatus)
        : "present";
      const notes = String(formData.get(`notes_${studentId}`) ?? "").trim();

      return {
        student_id: studentId,
        teacher_id: profile.id,
        course_id: courseId,
        subject_id: subjectId,
        schedule_id: sessionId,
        attendance_date: date,
        status,
        notes: notes || null
      };
    });

  const { data: existing, error: existingError } = await supabase
    .from("attendance_records")
    .select("id,student_id,status,notes")
    .eq("schedule_id", sessionId)
    .eq("attendance_date", date)
    .in("student_id", records.map((record) => record.student_id))
    .returns<ExistingRecord[]>();

  if (existingError) {
    redirect(withToast(`/dashboard/tutor/attendance/${sessionId}`, "error", "No se pudo guardar la asistencia."));
  }

  const existingByStudent = new Map((existing ?? []).map((record) => [record.student_id, record]));
  const { error } = await supabase
    .from("attendance_records")
    .upsert(records as never, { onConflict: "student_id,schedule_id,attendance_date" });

  if (error) {
    redirect(withToast(`/dashboard/tutor/attendance/${sessionId}`, "error", "No se pudo guardar la asistencia."));
  }

  await Promise.all(
    records.map((record) => {
      const before = existingByStudent.get(record.student_id);

      return logAuditAction({
        actorUserId: profile.id,
        actorRole: profile.role,
        action: before ? "attendance_updated" : "attendance_created",
        module: "attendance",
        entityType: "attendance_records",
        entityId: before?.id ?? null,
        beforeData: before ?? null,
        afterData: record
      });
    })
  );

  revalidatePath(`/dashboard/tutor/attendance/${sessionId}`);
  revalidatePath("/dashboard/tutor");
  revalidatePath("/dashboard/tutor/schedule");
  redirect(withToast(`/dashboard/tutor/attendance/${sessionId}`, "success", "Asistencia guardada correctamente."));
}
