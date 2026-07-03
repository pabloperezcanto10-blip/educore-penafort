import { createClient } from "@/lib/supabase/server";

export type TeacherScheduleSlot = {
  id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  course_name: string;
  subject_name: string | null;
  is_break: boolean;
  created_at: string;
};

const weekdayLabels = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes"
} as const;

export const teacherScheduleWeekdays = [1, 2, 3, 4, 5] as const;

export function getMadridWeekday() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short"
  }).format(new Date());

  const weekdays: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5
  };

  return weekdays[weekday] ?? null;
}

export function getWeekdayLabel(weekday: number | null) {
  if (!weekday || !(weekday in weekdayLabels)) {
    return "Hoy";
  }

  return weekdayLabels[weekday as keyof typeof weekdayLabels];
}

export async function getTeacherScheduleForToday(teacherId: string): Promise<{
  slots: TeacherScheduleSlot[];
  weekday: number | null;
  errorMessage: string | null;
}> {
  const weekday = getMadridWeekday();

  if (!weekday) {
    return { slots: [], weekday, errorMessage: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_schedule")
    .select("id,teacher_id,weekday,start_time,end_time,course_name,subject_name,is_break,created_at")
    .eq("teacher_id", teacherId)
    .eq("weekday", weekday)
    .order("start_time", { ascending: true })
    .returns<TeacherScheduleSlot[]>();

  if (error) {
    return { slots: [], weekday, errorMessage: error.message };
  }

  return { slots: data ?? [], weekday, errorMessage: null };
}

export async function getTeacherScheduleForWeek(teacherId: string): Promise<{
  slots: TeacherScheduleSlot[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_schedule")
    .select("id,teacher_id,weekday,start_time,end_time,course_name,subject_name,is_break,created_at")
    .eq("teacher_id", teacherId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true })
    .returns<TeacherScheduleSlot[]>();

  if (error) {
    return { slots: [], errorMessage: error.message };
  }

  return { slots: data ?? [], errorMessage: null };
}

export function formatScheduleTime(value: string) {
  return value.slice(0, 5);
}
