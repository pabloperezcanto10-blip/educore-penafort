import type { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type AttendanceClient = Awaited<ReturnType<typeof createClient>>;

export function saveAttendanceWithObservations(
  supabase: AttendanceClient,
  args: Database["public"]["Functions"]["save_attendance_with_observations"]["Args"]
) {
  // Bridge the older SSR factory types to the installed Supabase client's RPC schema.
  const client = supabase as unknown as SupabaseClient<Database>;
  return client.rpc("save_attendance_with_observations", args);
}

export async function getAttendanceInternalNotes(
  supabase: AttendanceClient,
  schoolId: string,
  recordIds: string[],
  source: "session" | "daily"
) {
  const notes = new Map<string, string>();
  if (recordIds.length === 0) return { notes, errorMessage: null };
  const column = source === "session" ? "attendance_record_id" : "daily_attendance_id";
  const { data, error } = await supabase
    .from("student_observations")
    .select("attendance_record_id,daily_attendance_id,content")
    .eq("school_id", schoolId)
    .in(column, recordIds)
    .returns<{ attendance_record_id: string | null; daily_attendance_id: string | null; content: string }[]>();
  if (error) return { notes, errorMessage: "No se pudieron cargar las observaciones internas." };
  for (const row of data ?? []) {
    const id = row[column];
    if (id) notes.set(id, row.content);
  }
  return { notes, errorMessage: null };
}
